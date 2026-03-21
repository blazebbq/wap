import { v4 as uuidv4 } from "uuid";
import type { Account, AccountPermission } from "@/types";

/** Permissions granted to developer accounts – intentionally limited. */
export const DEVELOPER_PERMISSIONS: AccountPermission[] = [
  "read:own_profile",
  "write:own_profile",
  "read:debug_info",
];

/**
 * In-memory store for developer accounts.
 * In a real application this would be backed by a database.
 * Developer accounts are ephemeral: they are lost when the process restarts.
 */
const developerAccounts = new Map<string, Account>();

/**
 * Creates a new developer account with limited permissions.
 * Developer accounts do not require an email address.
 */
export function createDeveloperAccount(): Account {
  const account: Account = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    isDeveloper: true,
    permissions: DEVELOPER_PERMISSIONS,
  };
  developerAccounts.set(account.id, account);
  return account;
}

/** Returns a stored developer account by ID, or undefined if not found. */
export function getDeveloperAccount(id: string): Account | undefined {
  return developerAccounts.get(id);
}

/** Returns all stored developer accounts (useful in tests). */
export function listDeveloperAccounts(): Account[] {
  return Array.from(developerAccounts.values());
}

/** Removes all developer accounts from the in-memory store (used in tests). */
export function clearDeveloperAccounts(): void {
  developerAccounts.clear();
}
