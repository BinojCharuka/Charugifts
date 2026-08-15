import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function resolveTenant() {
  let prefix = "cuddle-co"; // default fallback tenant

  try {
    const headersList = await headers();
    const host = headersList.get("host") || "";
    
    // Resolve subdomain (e.g. cuddle-co.localhost:3000 or cuddle-co.luminagifts.com)
    if (host && host.includes(".")) {
      const parts = host.split(":");
      const domainParts = parts[0].split(".");
      
      // If we have a subdomain (e.g., cuddle-co.localhost or cuddle-co.luminagifts.com)
      if (domainParts.length >= 2) {
        // Exclude generic localhost or standard domain suffixes
        const sub = domainParts[0];
        if (sub !== "www" && sub !== "localhost") {
          prefix = sub;
        }
      }
    }
  } catch (e) {
    console.warn("Could not read headers for tenant resolution:", e);
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.domainPrefix, prefix),
  });

  if (!tenant) {
    // Fallback to first tenant in DB
    const firstTenant = await db.query.tenants.findFirst();
    if (!firstTenant) {
      throw new Error("No tenants exist in the database. Please run npm run seed first.");
    }
    return firstTenant;
  }

  return tenant;
}
