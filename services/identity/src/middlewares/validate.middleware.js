import { AppError } from '../utils/AppError.js';

export function validateInput(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError(422, 'INVALID_INPUT', 'Invalid authentication input');
  return result.data;
}
