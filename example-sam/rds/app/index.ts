import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import { Logger } from '@aws-lambda-powertools/logger';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { z } from 'zod';


const logger = new Logger();

const rdsClient = new RDSDataClient({});

const UserSchema = z.object({
  id: z.number(),
  name: z.string()
});


type User = z.infer<typeof UserSchema>;

const validateUser = (user: User): boolean => {
  if (typeof user.id !== 'number') return false;
  if (typeof user.name !== 'string' || user.name.length > 20) return false;
  return true;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Received request', { request: event });
  console.log('Received request', { request: event });
  const { httpMethod, path, body } = event;

  try {
    switch (httpMethod) {
      case 'GET':
        if (path === '/user') {
          const result = await rdsClient.send(new ExecuteStatementCommand({
            resourceArn: process.env.DB_CLUSTER_ARN,
            secretArn: process.env.DB_SECRET_ARN,
            database: process.env.DB_NAME,
            sql: 'SELECT * FROM users'
          }));
          return { statusCode: 200, body: JSON.stringify(result.records) };
        } else {
          const userId = path.split('/')[2];
          const result = await rdsClient.send(new ExecuteStatementCommand({
            resourceArn: process.env.DB_CLUSTER_ARN,
            secretArn: process.env.DB_SECRET_ARN,
            database: process.env.DB_NAME,
            sql: 'SELECT * FROM users WHERE id = :id',
            parameters: [{ name: 'id', value: { longValue: parseInt(userId) } }]
          }));
          return { statusCode: 200, body: JSON.stringify(result.records[0]) };
        }

      case 'POST':
        if (path === "/initialize") {
          await rdsClient.send(new ExecuteStatementCommand({
            resourceArn: process.env.DB_CLUSTER_ARN,
            secretArn: process.env.DB_SECRET_ARN,
            database: process.env.DB_NAME,
            sql: 'CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY, name VARCHAR(20))'
          }));
          return { statusCode: 200, body: JSON.stringify({ message: 'Table created successfully' }) };
        }
        const newUser = parser.parseEventBody<User>(event);
        if (!validateUser(newUser)) {
          return { statusCode: 400, body: JSON.stringify({ message: 'Invalid user data' }) };
        }
        await rdsClient.send(new ExecuteStatementCommand({
          resourceArn: process.env.DB_CLUSTER_ARN,
          secretArn: process.env.DB_SECRET_ARN,
          database: process.env.DB_NAME,
          sql: 'INSERT INTO users (id, name) VALUES (:id, :name)',
          parameters: [
            { name: 'id', value: { longValue: newUser.id } },
            { name: 'name', value: { stringValue: newUser.name } }
          ]
        }));
        return { statusCode: 201, body: JSON.stringify({ message: 'User created successfully' }) };

      case 'PUT':
        const userId = path.split('/')[2];
        const updatedUser = parser.parseEventBody<User>(event);
        if (!validateUser(updatedUser)) {
          return { statusCode: 400, body: JSON.stringify({ message: 'Invalid user data' }) };
        }
        await rdsClient.send(new ExecuteStatementCommand({
          resourceArn: process.env.DB_CLUSTER_ARN,
          secretArn: process.env.DB_SECRET_ARN,
          database: process.env.DB_NAME,
          sql: 'UPDATE users SET name = :name WHERE id = :id',
          parameters: [
            { name: 'id', value: { longValue: parseInt(userId) } },
            { name: 'name', value: { stringValue: updatedUser.name } }
          ]
        }));
        return { statusCode: 200, body: JSON.stringify({ message: 'User updated successfully' }) };

      case 'DELETE':
        const deleteUserId = path.split('/')[2];
        await rdsClient.send(new ExecuteStatementCommand({
          resourceArn: process.env.DB_CLUSTER_ARN,
          secretArn: process.env.DB_SECRET_ARN,
          database: process.env.DB_NAME,
          sql: 'DELETE FROM users WHERE id = :id',
          parameters: [{ name: 'id', value: { longValue: parseInt(deleteUserId) } }]
        }));
        return { statusCode: 200, body: JSON.stringify({ message: 'User deleted successfully' }) };

      default:
        return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
    }
  } catch (error) {
    logger.error('Error processing request', { error });
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};