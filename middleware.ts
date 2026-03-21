import { NextRequest, NextResponse } from "next/server";

const PLATFORM_HOST = process.env.PLATFORM_HOST ?? "app.yourbrand.co.uk";
const BASE_DOMAIN = process.env.BASE_DOMAIN ?? "yourbrand.co.uk";

// Paths that should never be rewritten (Next.js internals, auth, static files)
const BYPASS_PREFIXES = [
  "/_next",
  "/favicon",
  "/api/auth",
  "/platform",
  "/_tenant",
];

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0]; // strip port
  const { pathname } = req.nextUrl;

  // ── Skip bypass paths ──────────────────────────────────────────────────────
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Platform admin host ────────────────────────────────────────────────────
  if (hostname === PLATFORM_HOST || hostname === "localhost") {
    // Requests to /platform/* are served as-is
    // API routes are served as-is
    return NextResponse.next();
  }

  // ── Subdomain tenant routing ───────────────────────────────────────────────
  const subdomain = extractSubdomain(hostname, BASE_DOMAIN);

  if (!subdomain) {
    // Root domain – serve marketing/platform page
    return NextResponse.next();
  }

  // Resolve subdomain -> businessId via edge-compatible fetch (avoid Prisma in middleware)
  // We call an internal API route that does the DB lookup
  const resolveUrl = new URL(
    `/api/internal/resolve-tenant?subdomain=${encodeURIComponent(subdomain)}`,
    req.url
  );

  let businessId: string | null = null;
  try {
    const res = await fetch(resolveUrl.toString(), {
      headers: { "x-internal-secret": process.env.AUTH_SECRET ?? "" },
    });
    if (res.ok) {
      const data = (await res.json()) as { businessId?: string };
      businessId = data.businessId ?? null;
    }
  } catch {
    // If resolution fails, fall through (tenant not found)
  }

  if (!businessId) {
    return new NextResponse("Tenant not found", { status: 404 });
  }

  // Rewrite to /_tenant/[businessId]/...
  const rewrittenUrl = req.nextUrl.clone();
  rewrittenUrl.pathname = `/_tenant/${businessId}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.rewrite(rewrittenUrl);
  // Pass businessId via header for server components
  response.headers.set("x-business-id", businessId);
  response.headers.set("x-subdomain", subdomain);
  return response;
}

function extractSubdomain(hostname: string, baseDomain: string): string | null {
  if (hostname === baseDomain) return null;
  if (hostname.endsWith(`.${baseDomain}`)) {
    return hostname.slice(0, -(baseDomain.length + 1));
  }
  return null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
