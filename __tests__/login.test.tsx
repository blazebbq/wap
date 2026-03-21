/**
 * Tests for the LoginPage component.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/page";

// Mock isDebugMode so we can test both states.
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  isDebugMode: jest.fn(),
}));

import { isDebugMode } from "@/lib/utils";
const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

// Mock the global fetch.
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockIsDebugMode.mockReset();
  mockFetch.mockReset();
});

describe("LoginPage – magic link form", () => {
  it("renders the email input and send button", () => {
    mockIsDebugMode.mockReturnValue(false);
    render(<LoginPage />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send magic link/i })
    ).toBeInTheDocument();
  });

  it("shows confirmation message after submitting the form", async () => {
    mockIsDebugMode.mockReturnValue(false);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
    );
  });
});

describe("LoginPage – developer account button", () => {
  it("does NOT render the Create Developer Account button in production mode", () => {
    mockIsDebugMode.mockReturnValue(false);
    render(<LoginPage />);

    expect(
      screen.queryByTestId("create-dev-account-btn")
    ).not.toBeInTheDocument();
  });

  it("renders the Create Developer Account button in debug mode", () => {
    mockIsDebugMode.mockReturnValue(true);
    render(<LoginPage />);

    expect(screen.getByTestId("create-dev-account-btn")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create developer account/i })
    ).toBeInTheDocument();
  });

  it("calls POST /api/auth/developer when button is clicked", async () => {
    mockIsDebugMode.mockReturnValue(true);
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        account: {
          id: "test-id-123",
          isDeveloper: true,
          createdAt: new Date().toISOString(),
          permissions: ["read:own_profile", "read:debug_info"],
        },
        token: "test-token-abc",
      }),
    });

    render(<LoginPage />);
    await user.click(screen.getByTestId("create-dev-account-btn"));

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/developer", {
      method: "POST",
    });
  });

  it("displays account info after successful developer account creation", async () => {
    mockIsDebugMode.mockReturnValue(true);
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        account: {
          id: "dev-account-id",
          isDeveloper: true,
          createdAt: new Date().toISOString(),
          permissions: [
            "read:own_profile",
            "write:own_profile",
            "read:debug_info",
          ],
        },
        token: "dev-token-xyz",
      }),
    });

    render(<LoginPage />);
    await user.click(screen.getByTestId("create-dev-account-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("dev-account-info")).toBeInTheDocument()
    );

    expect(screen.getByText(/dev-account-id/i)).toBeInTheDocument();
    expect(screen.getByText(/dev-token-xyz/i)).toBeInTheDocument();
    expect(screen.getByText(/debugging only/i)).toBeInTheDocument();
  });

  it("shows an error message when account creation fails", async () => {
    mockIsDebugMode.mockReturnValue(true);
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "This endpoint is only available in debug mode." }),
    });

    render(<LoginPage />);
    await user.click(screen.getByTestId("create-dev-account-btn"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/debug mode/i);
  });
});
