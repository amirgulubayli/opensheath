import { createPool, type DatabaseConfig } from "@ethoxford/persistence";

export function createApiPool(connectionString: string) {
  const config: DatabaseConfig = {
    connectionString,
  };

  return createPool(config);
}
