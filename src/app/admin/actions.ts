"use server";

import { db } from "@/db";
import { tenants, sellers, products, orders, orderItems, promoCodes } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession, setSession, clearSession } from "@/lib/session";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
      adminEmail: session.email,
    };
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    throw new Error("Failed to load dashboard data.");
  }
}

export async function updateAdminCredentials(data: { email: string; currentPassword?: string; newPassword?: string }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    const sellerRecord = await db.query.sellers.findFirst({
      where: eq(sellers.id, session.sellerId),
    });

    if (!sellerRecord) {
      return { error: "Admin account not found." };
    }

    if (data.email !== sellerRecord.email) {
      const existing = await db.query.sellers.findFirst({
        where: eq(sellers.email, data.email.toLowerCase().trim()),
      });
      if (existing && existing.id !== session.sellerId) {
        return { error: "Email is already taken." };
      }
    }

    const updates: Partial<{ email: string; passwordHash: string }> = {};
    if (data.email !== sellerRecord.email) {
      updates.email = data.email.toLowerCase().trim();
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        return { error: "Current password is required to set a new password." };
      }
      const hashedCurrent = hashPassword(data.currentPassword);
      if (sellerRecord.passwordHash !== hashedCurrent) {
        return { error: "Current password is incorrect." };
      }
      updates.passwordHash = hashPassword(data.newPassword);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(sellers).set(updates).where(eq(sellers.id, session.sellerId));
      if (updates.email) {
        // update session with new email
        await setSession({
          ...session,
          email: updates.email,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update admin credentials:", error);
    return { error: "Failed to update credentials" };
  }
}

export async function sendPasswordResetEmail(email: string, origin: string) {
  try {
    const sellerRecord = await db.query.sellers.findFirst({
      where: eq(sellers.email, email.toLowerCase().trim()),
    });

    if (!sellerRecord) {
      // Don't leak if the email exists or not, just return success
      return { success: true };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // 1 hour expiry

    await db
      .update(sellers)
      .set({
        resetToken,
        resetTokenExpiry: expiry,
      })
      .where(eq(sellers.id, sellerRecord.id));

    const resetUrl = `${origin}/admin/reset-password?token=${resetToken}`;

    await resend.emails.send({
      from: "Lumina Gifts <onboarding@resend.dev>",
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset for your admin account.</p>
        <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send reset email:", error);
    return { error: "Failed to send reset email. Please try again." };
  }
}

export async function resetPassword(prevState: any, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) return { error: "Invalid or missing token." };
  if (!password || password.length < 6) return { error: "Password must be at least 6 characters long." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  try {
    const sellerRecord = await db.query.sellers.findFirst({
      where: eq(sellers.resetToken, token),
    });

    if (!sellerRecord || !sellerRecord.resetTokenExpiry || sellerRecord.resetTokenExpiry < new Date()) {
      return { error: "Token is invalid or has expired." };
    }

    const hashed = hashPassword(password);

    await db
      .update(sellers)
      .set({
        passwordHash: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(sellers.id, sellerRecord.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { error: "An unexpected error occurred. Please try again." };
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
    isGiftBox?: boolean;
    boxItems?: Array<{ name: string; imageUrl: string | null }>;
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
          isGiftBox: data.isGiftBox || false,
          boxItems: data.boxItems || null,
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
        isGiftBox: data.isGiftBox || false,
        boxItems: data.boxItems || null,
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
