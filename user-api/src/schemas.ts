import { z } from "zod";
import { AlbSchema } from '@aws-lambda-powertools/parser/schemas';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';

export const incomingEventSchema = z.object({
  httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]),
  path: z.string(),
  body: z.string().optional(),
});

export const userSchema = z.object({
  id: z.string().min(1, { message: "ID is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  age: z.number().int().positive().min(0, { message: "Age must be greater than or equal to 0" }).max(150, { message: "Age must be less than or equal to 150" }),
});

export const userEventSchema = AlbSchema.extend({
  body: JSONStringified(userSchema), 
});