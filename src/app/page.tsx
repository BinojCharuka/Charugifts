import { resolveTenant } from "@/lib/tenant";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import StorefrontClient from "./StorefrontClient";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const tenant = await resolveTenant();

  // Load tenant's products
  const dbProducts = await db.query.products.findMany({
    where: eq(products.tenantId, tenant.id),
    orderBy: (products, { desc }) => [desc(products.createdAt)],
  });

  return (
    <StorefrontClient
      tenant={{
        shopName: tenant.shopName,
        domainPrefix: tenant.domainPrefix,
        logoUrl: tenant.logoUrl,
        contentSettings: tenant.contentSettings ?? null,
      }}
      products={dbProducts}
    />
  );
}

