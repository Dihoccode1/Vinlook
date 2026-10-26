import { z } from 'zod';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^@\s]+@[^@\s]+$/u);
const password = z
  .string()
  .min(1)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72);
export const loginInput = z.strictObject({ email, password });
export const registrationInput = z
  .strictObject({
    email,
    password: password.refine((value) => [...value].length >= 15),
    fullName: z
      .string()
      .trim()
      .refine((value) => [...value].length >= 1 && [...value].length <= 100),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword);
