import { NextResponse } from "next/server";
import { createDeveloperAccount } from "@/lib/accounts";
import { generateSessionToken, isDebugMode } from "@/lib/utils";
import type {
  CreateDeveloperAccountResponse,
  ApiErrorResponse,
} from "@/types";

/**
 * POST /api/auth/developer
 *
 * Creates a temporary developer account that does not require an email
 * address. Only available in debug / test environments.
 */
export async function POST(): Promise<
  NextResponse<CreateDeveloperAccountResponse | ApiErrorResponse>
> {
  if (!isDebugMode()) {
    return NextResponse.json(
      { error: "This endpoint is only available in debug mode." },
      { status: 403 }
    );
  }

  const account = createDeveloperAccount();
  const token = generateSessionToken();

  return NextResponse.json({ account, token }, { status: 201 });
}
