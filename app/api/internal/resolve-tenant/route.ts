import { NextRequest, NextResponse } from "next/server";
import { resolveSubdomainToBusinessId } from "@/lib/tenant";

/**
 * Internal route called by middleware to resolve subdomain -> businessId.
 * Protected by a shared secret to prevent external abuse.
 */
export async function GET(req: NextRequest) {
  // Verify internal secret
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subdomain = req.nextUrl.searchParams.get("subdomain");
  if (!subdomain) {
    return NextResponse.json({ error: "Missing subdomain" }, { status: 400 });
  }

  const businessId = await resolveSubdomainToBusinessId(subdomain);
  if (!businessId) {
    return NextResponse.json({ businessId: null }, { status: 404 });
  }

  return NextResponse.json({ businessId });
}
