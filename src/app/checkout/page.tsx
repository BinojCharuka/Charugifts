import { resolveTenant } from "@/lib/tenant";
import { db } from "@/db";
import { products, promoCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  searchParams: Promise<{ product?: string; qty?: string; note?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const tenant = await resolveTenant();
  const params = await searchParams;
  const productId = params.product;
  const qty = params.qty ? parseInt(params.qty) : 1;
  const initialNote = params.note || "";

  let selectedProduct = null;
  if (productId) {
    selectedProduct = await db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.tenantId, tenant.id)
      ),
    });
  }

  // Fallback: if no product is selected or not found, grab the first available product of this tenant
  if (!selectedProduct) {
    selectedProduct = await db.query.products.findFirst({
      where: eq(products.tenantId, tenant.id),
    });
  }

  const tenantPromoCodes = await db.query.promoCodes.findMany({
    where: and(
      eq(promoCodes.tenantId, tenant.id),
      eq(promoCodes.isActive, true)
    ),
  });

  return (
    <CheckoutClient
      tenant={{
        id: tenant.id,
        shopName: tenant.shopName,
        bankDetails: tenant.bankDetails,
        contentSettings: tenant.contentSettings,
      }}
      promoCodes={tenantPromoCodes.map(p => ({
        id: p.id,
        code: p.code,
        discountAmount: p.discountAmount,
        usageLimit: p.usageLimit,
        usedCount: p.usedCount,
        isActive: p.isActive,
      }))}
      product={
        selectedProduct
          ? {
              id: selectedProduct.id,
              name: selectedProduct.name,
              price: selectedProduct.price,
              imageUrl: selectedProduct.imageUrl,
            }
          : null
      }
      initialQty={qty}
      initialNote={initialNote}
    />
  );
}
