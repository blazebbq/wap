/**
 * Tests for the developer account API route.
 * Uses direct imports to exercise the route handler outside of Next.js.
 * @jest-environment node
 */
import { POST } from "@/app/api/auth/developer/route";
import { clearDeveloperAccounts, listDeveloperAccounts } from "@/lib/accounts";

// Mock isDebugMode so tests can control the environment flag.
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  isDebugMode: jest.fn(),
}));

import { isDebugMode } from "@/lib/utils";
const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

beforeEach(() => {
  clearDeveloperAccounts();
  mockIsDebugMode.mockReset();
});

describe("POST /api/auth/developer", () => {
  it("returns 403 when not in debug mode", async () => {
    mockIsDebugMode.mockReturnValue(false);

    const response = await POST();

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/debug mode/i);
  });

  it("creates a developer account in debug mode", async () => {
    mockIsDebugMode.mockReturnValue(true);

    const response = await POST();

    expect(response.status).toBe(201);
    const body = await response.json();

    expect(body.account).toBeDefined();
    expect(body.account.isDeveloper).toBe(true);
    expect(body.account.id).toBeTruthy();
    expect(body.account.permissions).toContain("read:own_profile");
    expect(body.account.permissions).toContain("read:debug_info");
    expect(body.account.email).toBeUndefined();
    expect(body.token).toBeTruthy();
  });

  it("persists the account in the in-memory store", async () => {
    mockIsDebugMode.mockReturnValue(true);

    await POST();

    const accounts = listDeveloperAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].isDeveloper).toBe(true);
  });

  it("returns a unique ID for each account", async () => {
    mockIsDebugMode.mockReturnValue(true);

    const r1 = await POST();
    const r2 = await POST();

    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.account.id).not.toBe(b2.account.id);
  });

  it("response includes createdAt timestamp", async () => {
    mockIsDebugMode.mockReturnValue(true);

    const before = Date.now();
    const response = await POST();
    const after = Date.now();

    const body = await response.json();
    const createdAt = new Date(body.account.createdAt).getTime();
    expect(createdAt).toBeGreaterThanOrEqual(before);
    expect(createdAt).toBeLessThanOrEqual(after);
  });
});
