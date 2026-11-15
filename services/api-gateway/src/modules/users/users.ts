import { create_user_routes } from './users.routes.js';
import { mssql_users } from './users.mssql.js';
import { postgres_users } from './users.postgres.js';
export { validate_user } from './users.schema.js';
export { username_availability } from './users.routes.js';
export function user_routes() {
  return create_user_routes(process.env.DATABASE_URL ? postgres_users : mssql_users);
}
