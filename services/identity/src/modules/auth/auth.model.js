import mongoose from 'mongoose';
import { schemaOptions } from '../../utils/schema-options.js';

/** Staff account schema only; compiling it never connects or creates an index. */
export function createStaffAccountSchema() {
  const schema = new mongoose.Schema(
    {
      fullName: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: (value) => [...value].length >= 1 && [...value].length <= 100,
          message: 'Invalid name length',
        },
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
        match: /^[^@\s]+@[^@\s]+$/u,
      },
      passwordHash: {
        type: String,
        required: true,
        match: /^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/,
        select: false,
      },
      role: { type: String, required: true, enum: ['Staff', 'Manager'] },
      status: { type: String, required: true, enum: ['pending', 'active', 'locked'] },
      authVersion: {
        type: Number,
        required: true,
        min: 0,
        validate: { validator: Number.isSafeInteger, message: 'Invalid integer' },
      },
    },
    { ...schemaOptions('staff_accounts', ['passwordHash']), timestamps: true },
  );
  schema.index({ email: 1 }, { unique: true });
  return schema;
}
