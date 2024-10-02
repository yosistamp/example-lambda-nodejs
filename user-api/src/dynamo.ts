import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "UserTable";

export const createUser = async (user: User) => {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: user,
  });
  return docClient.send(command);
};

export const getUser = async (id: string) => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { id },
  });
  return docClient.send(command);
};

export const updateUser = async (id: string, updateData: Partial<User>) => {
  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id },
    UpdateExpression: "set #name = :name, #age = :age",
    ExpressionAttributeNames: {
      "#name": "name",
      "#age": "age",
    },
    ExpressionAttributeValues: {
      ":name": updateData.name,
      ":age": updateData.age,
    },
  });
  return docClient.send(command);
};

export const deleteUser = async (id: string) => {
  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id },
  });
  return docClient.send(command);
};
