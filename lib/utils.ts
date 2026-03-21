import { v4 as uuidv4 } from "uuid";

/**
 * Generates an opaque session token.
 * In production this should be a signed JWT with an expiry claim.
 */
export function generateSessionToken(): string {
  return uuidv4().replace(/-/g, "");
}

/**
 * Returns true when the application is running in a debug / test environment.
 * Controlled by the NEXT_PUBLIC_DEBUG_MODE environment variable so that the
 * value is available both on the server and the client.
 */
export function isDebugMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEBUG_MODE === "true" ||
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  );
}
