import * as Joi from "joi";

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().optional(),
  API_PORT: Joi.number().default(3001),
  NEXT_PUBLIC_API_URL: Joi.string().default("http://localhost:3000"),
  SMTP_HOST: Joi.string().allow(""),
  SMTP_PORT: Joi.number().default(465),
  SMTP_USER: Joi.string().allow(""),
  SMTP_PASSWORD: Joi.string().allow(""),
  EMAIL_FROM: Joi.string().default("noreply@onboardingtracker.com"),
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
});