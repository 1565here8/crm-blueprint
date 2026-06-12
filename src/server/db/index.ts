import type { NetworkCoreStore } from "./networkCoreStore";
import { createDatabase, createEphemeralDatabase } from "./networkCoreStore";

let store: NetworkCoreStore | null = null;

export async function initDatabase(options?: { ephemeral?: boolean }) {
  if (store) await store.close();
  store = options?.ephemeral ? await createEphemeralDatabase() : await createDatabase();
  return store;
}

export function getDb(): NetworkCoreStore {
  if (!store) throw new Error("Database not initialized. Call initDatabase() first.");
  return store;
}

export async function shutdownDatabase() {
  if (store) {
    await store.close();
    store = null;
  }
}

export async function revokeSessionToken(jti: string) {
  await getDb().revokeToken(jti);
}

export async function isSessionTokenRevoked(jti: string | undefined) {
  return getDb().isTokenRevoked(jti);
}

export { createEphemeralDatabase } from "./networkCoreStore";
