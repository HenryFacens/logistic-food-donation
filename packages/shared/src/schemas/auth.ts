import { z } from "zod";
import { isoDateTimeSchema } from "./common.js";
import { demoUserSchema } from "./actors.js";

// Brazilian mobile numbers in E.164, e.g. +5519999990001.
export const phoneNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^\d+]/g, ""))
  .transform((value) =>
    value.startsWith("+") ? value : `+55${value.replace(/^0+/, "")}`,
  )
  .pipe(z.string().regex(/^\+\d{12,14}$/));

export const requestLoginCodeRequestSchema = z.object({
  phone: phoneNumberSchema,
});

export const requestLoginCodeResponseSchema = z.object({
  sent: z.literal(true),
  expiresAt: isoDateTimeSchema,
  // Only present when the server runs with ENABLE_DEV_LOGIN_CODES=true.
  devCode: z.string().regex(/^\d{6}$/).optional(),
});

export const verifyLoginCodeRequestSchema = z.object({
  phone: phoneNumberSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const sessionResponseSchema = z.object({
  token: z.string().min(32),
  expiresAt: isoDateTimeSchema,
  user: demoUserSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
