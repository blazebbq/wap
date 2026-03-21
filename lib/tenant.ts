/**
 * Tenant resolution with in-memory cache stub.
 * In production, replace the in-memory cache with Redis.
 */

import { prisma } from "./prisma";

// Simple in-memory cache: subdomain -> businessId (5-minute TTL)
const cache = new Map<string, { businessId: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveSubdomainToBusinessId(
  subdomain: string
): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(subdomain);
  if (cached && cached.expiresAt > now) {
    return cached.businessId;
  }

  const business = await prisma.business.findFirst({
    where: {
      subdomain,
      status: { in: ["active", "trial"] },
    },
    select: { id: true },
  });

  if (!business) {
    // Cache negative results briefly (30s) to avoid hammering DB
    cache.set(subdomain, { businessId: "", expiresAt: now + 30_000 });
    return null;
  }

  cache.set(subdomain, {
    businessId: business.id,
    expiresAt: now + CACHE_TTL_MS,
  });
  return business.id;
}

export async function resolveDomainToBusinessId(
  domain: string
): Promise<string | null> {
  const now = Date.now();
  const cacheKey = `domain:${domain}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.businessId || null;
  }

  const record = await prisma.businessDomain.findFirst({
    where: { domain },
    select: { businessId: true },
  });

  const businessId = record?.businessId ?? "";
  cache.set(cacheKey, { businessId, expiresAt: now + CACHE_TTL_MS });
  return businessId || null;
}

/** Invalidate all cache entries for a business subdomain */
export function invalidateTenantCache(subdomain: string) {
  cache.delete(subdomain);
}
