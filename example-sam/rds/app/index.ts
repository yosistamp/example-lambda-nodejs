import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RDSClient, DescribeDBProxiesCommand } from '@aws-sdk/client-rds';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { parser } from '@aws-lambda-powertools/parser';
import { Logger  } from '@aws-lambda-powertools/logger';
import middy from '@middy/core';

import { Client } from 'pg';
import { z } from 'zod';

const logger = new Logger();

const region = 'ap-northeast-1';
const secretName = process.env.RDS_SECRET_NAME;
const rdsProxyEndpoint = process.env.RDS_PROXY_ENDPOINT;

const secretsClient = new SecretsManagerClient({ region });

interface DatabaseSecret {
  username: string;
  password: string;
}

const UserSchema = z.object({
  id: z.number(),
  name: z.string()
});

type User = z.infer<typeof UserSchema>;

const getSecrets = async () => {
  // Secrets Managerからシークレットを取得
  const getSecretCommand = new GetSecretValueCommand({ SecretId: secretName });
  const secretResponse = await secretsClient.send(getSecretCommand);
  if (!secretResponse.SecretString) {
    throw new Error('Secret not found');
  }
  const dbSecret: DatabaseSecret = JSON.parse(secretResponse.SecretString);
  return dbSecret;
}

const getClinent = async (dbSecret: DatabaseSecret) => {
  return new Client({
    host: rdsProxyEndpoint,
    port: 5432,
    database: process.env.DB_NAME,
    user: dbSecret.username,
    password: dbSecret.password,
    ssl: {
      rejectUnauthorized: false, // 本番環境では適切に設定してください
    },
  });
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Received request3', { request: event });
  console.log('Received request2', { request: event });
  const { httpMethod, path, body } = event;

  try {
    const dbSecret = await getSecrets();
    console.log('Secret: ' + dbSecret.username);

    switch (httpMethod) {
      case 'GET':
        if (path === '/user') {
          return await findUser();
        } else {
          const userId = path.split('/')[2];
          return await getUser(userId);
        }
      case 'POST':
        if (path === "/initialize") {
          try {
            return await createTable();
          } catch(error) {
            console.log(error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Error creating table' }) };
          }
        }
        return await insertUser(body);
      case 'PUT':
        const userId = path.split('/')[2];
        return await updateUser(body, userId);
      case 'DELETE':
        const deleteUserId = path.split('/')[2];
        return await deleteUser(deleteUserId);
      default:
        return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
    }
  } catch (error) {
    logger.error('Error processing request', { error });
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid input',
          errors: error.errors,
        }),
      };
    }
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};

// CreateTable
const createTable = async () => {
  const client = await getClinent(await getSecrets());
  await client.connect()
  const createTableResult = await client.query(
    'CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY, name VARCHAR(20))'
  );
  console.log('CreateTable result:', createTableResult.rowCount);
  return { statusCode: 200, body: JSON.stringify({ message: 'Table created successfully' }) };
}

const findUser = async() => {
  const client = await getClinent(await getSecrets());
  await client.connect()
  const res = await client.query('SELECT * FROM users');
  return { statusCode: 200, body: JSON.stringify(res.rows) };
}

const getUser = async(userId: string) => {
  const client = await getClinent(await getSecrets());
  await client.connect()
  const res = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
  return res.rows[0];
}

const insertUser = async (body: string|null) => {
  // 入力チェック
  if (!body) {
    throw new Error('Request body is missing');
  }
  const validatedUser = UserSchema.parse(JSON.parse(body));
  logger.info('Validated user data', { user: validatedUser });

  // Insert
  const client = await getClinent(await getSecrets());
  await client.connect()
  const insertResult = await client.query(
    'INSERT INTO users (id, name) VALUES ($1, $2) RETURNING id', [validatedUser.id, validatedUser.name]
  );
  console.log('Insert result:', insertResult.rows[0].id);
  return { statusCode: 201, body: JSON.stringify({ message: 'User created successfully' }) };
}

const updateUser = async (body: string|null, userId: string) => {
  if (!body) {
    throw new Error('Request body is missing');
  }
  let user = JSON.parse(body);
  user.id = userId;
  const validatedUser = UserSchema.parse(user);
  logger.info('Validated user data', { user: validatedUser });

  // update
  const client = await getClinent(await getSecrets());
  await client.connect()
  const updateResult = await client.query(
    'UPDATE users SET name = $1 WHERE id = $2 RETURNING  *', [validatedUser.name, validatedUser.id]
  );
  console.log('Update result:', updateResult.rows[0]);
  return { statusCode: 200, body: JSON.stringify({ message: 'User updated successfully' }) };
}

const deleteUser = async (userId: string) => {
  const client = await getClinent(await getSecrets());
  await client.connect()
  const deleteResult = await client.query(
    'DELETE FROM users WHERE id = $1 RETURNING id', [userId]
  );
  console.log('Delete result:', deleteResult.rows[0].id);
  return { statusCode: 200, body: JSON.stringify({ message: 'User deleted successfully' }) };
}

export const handler = middy(lambdaHandler)
