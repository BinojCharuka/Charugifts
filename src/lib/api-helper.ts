import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";

/**
 * Resolves the tenant for a given API request.
 * Tries query parameter first, then custom header, and falls back to host subdomain resolution.
 */
export async function resolveTenantForRequest(req?: NextRequest) {
  let prefix = "";

  if (req) {
    const url = new URL(req.url);
    const tenantParam = url.searchParams.get("tenant");
    if (tenantParam) {
      prefix = tenantParam.toLowerCase().trim();
    } else {
      const tenantHeader = req.headers.get("x-tenant-prefix");
      if (tenantHeader) {
        prefix = tenantHeader.toLowerCase().trim();
      }
    }
  }

  if (!prefix) {
    try {
      const headersList = await headers();
      const host = headersList.get("host") || "";
      if (host && host.includes(".")) {
        const parts = host.split(":");
        const domainParts = parts[0].split(".");
        if (domainParts.length >= 2) {
          const sub = domainParts[0];
          if (sub !== "www" && sub !== "localhost") {
            prefix = sub;
          }
        }
      }
    } catch (e) {
      console.warn("Could not read headers for tenant resolution:", e);
    }
  }

  // Default fallback if still unresolved
  if (!prefix) {
    prefix = "cuddle-co";
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.domainPrefix, prefix),
  });

  if (!tenant) {
    const firstTenant = await db.query.tenants.findFirst();
    if (!firstTenant) {
      throw new Error("No tenants exist in the database. Please run npm run seed first.");
    }
    return firstTenant;
  }

  return tenant;
}

/**
 * Authenticates a seller request using session cookies.
 * Returns the session data or null if unauthorized.
 */
export async function authenticateSeller() {
  try {
    const session = await getSession();
    return session;
  } catch (error) {
    console.error("API authentication error:", error);
    return null;
  }
}

/**
 * Standard utility for structured JSON responses
 */
export function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
