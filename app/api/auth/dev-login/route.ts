import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Dev-only login endpoint. Creates a real database session for the seeded
 * admin account so developers can skip the magic-link email flow.
 *
 * IMPORTANT: This route returns 403 in production and must NEVER be
 * reached in a production deployment.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  // Validate and sanitise the redirect target (relative paths only)
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "";
  const redirectTo =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/platform/dashboard";

  // Upsert the seeded platform admin user
  const email = "admin@yourbrand.co.uk";
  const user = await prisma.platformUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Dev Admin",
      isPlatformAdmin: true,
    },
  });

  // Generate a cryptographically-secure session token
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Persist the session in the database (same table Auth.js uses)
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  // Redirect and set the session cookie that Auth.js will pick up on the
  // next request. The cookie name matches the one configured in auth.ts.
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  response.cookies.set("__Secure-next-auth.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Intentionally NOT secure — this route only runs outside production.
    // Browsers accept __Secure- prefix cookies on localhost for dev use.
    secure: false,
    expires,
  });

  return response;
}
