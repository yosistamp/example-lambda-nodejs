import { z } from 'zod';
import { ALBEvent, ALBResult, Context } from "aws-lambda";
import { Logger } from '@aws-lambda-powertools/logger';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpEventNormalizer from "@middy/http-event-normalizer";
import httpErrorHandler from "@middy/http-error-handler";
import { createUser, getUser, updateUser, deleteUser } from "./dynamo";
import { User } from "./types";
import { userSchema, userEventSchema } from "./schemas";
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';

const tracer = new Tracer({ serviceName: 'serverlessAirline' });

const logger = new Logger();

type UserEvent = z.infer<typeof userEventSchema>;

const lambdaHandler = async (event: UserEvent, context: Context): Promise<ALBResult> => {
  try {
    logger.info("Received event", { event });

    const { httpMethod, path, body } = event;
    const id = path.split("/").pop();

    switch (httpMethod) {
      case "POST":
        if (!body) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Request body is required" }),
          };
        }
        try {
          //const user = userSchema.parse(JSON.parse(body));
          await createUser(body);
        } catch (error) {
          return { statusCode: 400, body: JSON.stringify({ message: error }) };
        }
        return { statusCode: 201, body: JSON.stringify({ message: "User created successfully" }) };
      case "GET":
        if (id) {
          const user = await getUser(id);
          return { statusCode: 200, body: JSON.stringify(user.Item) };
        }
        return { statusCode: 400, body: JSON.stringify({ message: "User ID is required" }) };

      case "PUT":
        if (id) {
          const updateData = body as Partial<User>;
          await updateUser(id, updateData);
          return { statusCode: 200, body: JSON.stringify({ message: "User updated successfully" }) };
        }
        return { statusCode: 400, body: JSON.stringify({ message: "User ID is required" }) };

      case "DELETE":
        if (id) {
          await deleteUser(id);
          return { statusCode: 200, body: JSON.stringify({ message: "User deleted successfully" }) };
        }
        return { statusCode: 400, body: JSON.stringify({ message: "User ID is required" }) };

      default:
        return { statusCode: 405, body: JSON.stringify({ message: "Method not allowed" }) };
    }
  } catch (error) {
    logger.error("Error processing request", { error });
    return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
  }
};

// カスタムミドルウェアを作成して、POSTリクエストのときのみparserを適用
const conditionalParser = () => {
  return {
    before: async (handler: any) => {
      if (handler.event.httpMethod === 'POST') {
        await parser({ schema: userEventSchema }).before?.(handler);
      }
    },
    onError: async (handler: any) => {
      console.log(handler.error);
      if (handler.error.name === 'ZodError') {
        handler.response = {
          statusCode: 400,
          body: JSON.stringify({ message: handler.error.errors }),
        };
      } else {
        handler.response = {
          statusCode: 400,
          body: "parse error",
        };
      }
    }
  };
};

export const handler = middy(lambdaHandler)
//  .use(httpJsonBodyParser())
//  .use(httpEventNormalizer())
  .use(captureLambdaHandler(tracer))
  .use(conditionalParser())
  .use(httpErrorHandler());