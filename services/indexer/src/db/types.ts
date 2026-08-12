export interface SqlQueryResult {
  rows: readonly Record<string, unknown>[];
}

export interface SqlClient {
  query(text: string, values?: readonly unknown[]): Promise<SqlQueryResult>;
}
