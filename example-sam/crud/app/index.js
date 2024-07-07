const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { Logger } = require("@aws-lambda-powertools/logger");

const logger = new Logger({ serviceName: "UserCRUDService" });
//const validator = new Validator();

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Users";

const userSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    name: { type: "string", maxLength: 20 }
  },
  required: ["id", "name"]
};

exports.handler = async (event) => {
  logger.info("Received event", { event: JSON.stringify(event) });

  const { requestContext, body } = event;
  const httpMethod = requestContext.http.method;
  const path = requestContext.http.path;
  const id = path.split("/").pop();

  try {
    switch (httpMethod) {
      case "POST":
        return await createUser(JSON.parse(body));
      case "GET":
        return id !== "user" ? await getUser(id) : await listUsers();
      case "PUT":
        return await updateUser(id, JSON.parse(body));
      case "DELETE":
        return await deleteUser(id);
      default:
        return { statusCode: 400, body: JSON.stringify({ message: "Unsupported HTTP method" }) };
    }
  } catch (error) {
    logger.error("Error processing request", { error });
    return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
  }
}

async function createUser(userData) {
//   try {
//     validator.validate(userData, userSchema);
//   } catch (error) {
//     return { statusCode: 400, body: JSON.stringify({ message: "Invalid user data", details: error.message }) };
//   }

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: userData
  }));

  return { statusCode: 201, body: JSON.stringify(userData) };
}

async function getUser(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: Number(id) }
  }));

  if (!Item) {
    return { statusCode: 404, body: JSON.stringify({ message: "User not found" }) };
  }

  return { statusCode: 200, body: JSON.stringify(Item) };
}

async function listUsers() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return { statusCode: 200, body: JSON.stringify(Items) };
}

async function updateUser(id, userData) {
//   try {
//     validator.validate(userData, userSchema);
//   } catch (error) {
//     return { statusCode: 400, body: JSON.stringify({ message: "Invalid user data", details: error.message }) };
//   }

  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: Number(id) },
    UpdateExpression: "set #name = :name",
    ExpressionAttributeNames: { "#name": "name" },
    ExpressionAttributeValues: { ":name": userData.name }
  }));

  return { statusCode: 200, body: JSON.stringify({ id: Number(id), ...userData }) };
}

async function deleteUser(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: Number(id) }
  }));

  return { statusCode: 204, body: "" };
}

