"use server";

import { db } from "@/db";
import { tenants, sellers, products, orders, orderItems, promoCodes } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession, setSession, clearSession } from "@/lib/session";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function sellerLogin(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please fill in all fields." };
  }

  try {
    const sellerRecord = await db.query.sellers.findFirst({
      where: eq(sellers.email, email.toLowerCase().trim()),
    });

    if (!sellerRecord) {
      return { error: "Invalid email or password." };
    }

    const hashed = hashPassword(password);
    if (sellerRecord.passwordHash !== hashed) {
      return { error: "Invalid email or password." };
    }

    // Set session
    await setSession({
      sellerId: sellerRecord.id,
      tenantId: sellerRecord.tenantId,
      email: sellerRecord.email,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Login action error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function sellerLogout() {
  await clearSession();
  return { success: true };
}

export async function getDashboardData() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const { tenantId } = session;

  try {
    // 1. Fetch Tenant
    const tenantInfo = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenantInfo) {
      throw new Error("Tenant not found");
    }

    // 2. Fetch Products
    const dbProducts = await db.query.products.findMany({
      where: eq(products.tenantId, tenantId),
      orderBy: [desc(products.createdAt)],
    });

    // 3. Fetch Orders
    const dbOrders = await db.query.orders.findMany({
      where: eq(orders.tenantId, tenantId),
      orderBy: [desc(orders.createdAt)],
    });

    // 4. Calculate Stats
    const totalOrdersCount = dbOrders.length;
    const pendingPaymentCount = dbOrders.filter((o) => o.paymentStatus === "PENDING").length;
    const shippedCount = dbOrders.filter((o) => o.orderStatus === "SHIPPED").length;
    const deliveredCount = dbOrders.filter((o) => o.orderStatus === "DELIVERED").length;

    return {
      tenant: tenantInfo,
      products: dbProducts,
      orders: dbOrders,
      stats: {
        totalOrders: totalOrdersCount.toString(),
        pendingPayment: pendingPaymentCount.toString(),
        shipped: shippedCount.toString(),
        delivered: deliveredCount.toString(),
      },
      promoCodes: await db.query.promoCodes.findMany({
        where: eq(promoCodes.tenantId, tenantId),
        orderBy: [desc(promoCodes.createdAt)],
      }),
    };
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    throw new Error("Failed to load dashboard data.");
  }
}

export async function updateOrderStatus(
  orderId: string,
  paymentStatus: "PENDING" | "VERIFIED" | "REJECTED",
  orderStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED"
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db
      .update(orders)
      .set({
        paymentStatus,
        orderStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, session.tenantId)));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update order status:", error);
    return { error: "Failed to update order status" };
  }
}

export async function updateStoreSettings(data: {
  shopName: string;
  domainPrefix: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  };
  logoUrl?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    // Check if domainPrefix is unique and not used by another tenant
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.domainPrefix, data.domainPrefix.toLowerCase().trim()),
    });

    if (existing && existing.id !== session.tenantId) {
      return { error: "This URL prefix is already taken." };
    }

    await db
      .update(tenants)
      .set({
        shopName: data.shopName,
        domainPrefix: data.domainPrefix.toLowerCase().trim(),
        bankDetails: data.bankDetails,
        logoUrl: data.logoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, session.tenantId));

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update store settings:", error);
    return { error: "Failed to update settings" };
  }
}

export async function updateContentSettings(data: {
  whatsapp: string;
  location: string;
  announcementText: string;
  heroBadge: string;
  heroHeading: string;
  heroSubtext: string;
  heroPrimaryBtn: string;
  heroSecondaryBtn: string;
  footerTagline: string;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  nextDayDeliveryText?: string;
  heroTagText?: string;
  heroImageUrl?: string;
  deliveryFee?: string;
  slides?: Array<{
    badge: string;
    heading: string;
    description: string;
    price?: string;
    buttonText: string;
    buttonLink?: string;
    imageUrl: string;
    tagText?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db
      .update(tenants)
      .set({ contentSettings: data, updatedAt: new Date() })
      .where(eq(tenants.id, session.tenantId));

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update content settings:", error);
    return { error: "Failed to update content settings" };
  }
}


export async function upsertProduct(
  productId: string | null, // null for create
  data: {
    name: string;
    description: string;
    price: string;
    inStock: boolean;
    stockCount: number;
    imageUrl?: string;
  }
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    if (productId) {
      // Update
      await db
        .update(products)
        .set({
          name: data.name,
          description: data.description,
          price: data.price,
          inStock: data.inStock,
          stockCount: data.stockCount,
          imageUrl: data.imageUrl || null,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, productId), eq(products.tenantId, session.tenantId)));
    } else {
      // Create
      await db.insert(products).values({
        tenantId: session.tenantId,
        name: data.name,
        description: data.description,
        price: data.price,
        inStock: data.inStock,
        stockCount: data.stockCount,
        imageUrl: data.imageUrl || null,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to upsert product:", error);
    return { error: "Failed to save product" };
  }
}

export async function deleteProduct(productId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.tenantId, session.tenantId)));

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete product:", error);
    return { error: "Failed to delete product" };
  }
}

export async function upsertPromoCode(id: string | null, data: {
  code: string;
  discountAmount: string;
  usageLimit: number;
  isActive: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    if (id) {
      await db
        .update(promoCodes)
        .set({
          code: data.code.toUpperCase().trim(),
          discountAmount: data.discountAmount,
          usageLimit: data.usageLimit,
          isActive: data.isActive,
          updatedAt: new Date(),
        })
        .where(and(eq(promoCodes.id, id), eq(promoCodes.tenantId, session.tenantId)));
    } else {
      await db.insert(promoCodes).values({
        tenantId: session.tenantId,
        code: data.code.toUpperCase().trim(),
        discountAmount: data.discountAmount,
        usageLimit: data.usageLimit,
        isActive: data.isActive,
      });
    }
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save promo code:", error);
    if (error.code === '23505') {
       return { error: "Promo code already exists" };
    }
    return { error: "Failed to save promo code" };
  }
}

export async function deletePromoCode(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db
      .delete(promoCodes)
      .where(and(eq(promoCodes.id, id), eq(promoCodes.tenantId, session.tenantId)));
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete promo code:", error);
    return { error: "Failed to delete promo code" };
  }
}

export async function toggleProductStock(productId: string, currentInStock: boolean) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db
      .update(products)
      .set({
        inStock: !currentInStock,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.tenantId, session.tenantId)));

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle stock:", error);
    return { error: "Failed to toggle stock status" };
  }
}
