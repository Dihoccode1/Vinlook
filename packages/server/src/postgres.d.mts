export interface QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}
export interface QueryClient {
  query<T = Record<string, any>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
}
export function uses_postgres(): boolean;
export function get_postgres(): QueryClient;
export function query<T = Record<string, any>>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>>;
export function transaction<T>(action: (client: QueryClient) => Promise<T>): Promise<T>;
export function close_postgres(): Promise<void>;
