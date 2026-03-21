export type AccountPermission =
  | "read:own_profile"
  | "write:own_profile"
  | "read:debug_info";

export interface Account {
  id: string;
  createdAt: string;
  isDeveloper: boolean;
  permissions: AccountPermission[];
  /** Present on regular accounts; absent on developer accounts */
  email?: string;
}

export interface CreateDeveloperAccountResponse {
  account: Account;
  /** Session token for the new developer account */
  token: string;
}

export interface ApiErrorResponse {
  error: string;
}
