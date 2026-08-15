"use server";

import { db } from "@/db";
import { orders, orderItems, products, promoCodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface OrderItemInput {
  productId: string;
  name: string;
  price: string;
  quantity: number;
}

interface SubmitOrderInput {
  tenantId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  customNote: string;
  totalAmount: string;
  deliveryFee: string;
  discountAmount: string;
  paymentMethod: string;
  promoCodeId?: string;
  receiptUrl: string;
  items: OrderItemInput[];
}

export async function submitOrder(data: SubmitOrderInput) {
  if (!data.customerName.trim() || !data.customerPhone.trim() || !data.shippingAddress.trim()) {
    return { error: "Please fill in all shipping details." };
  }

  if (data.items.length === 0) {
    return { error: "Your cart is empty." };
  }

  try {
    // Validate stock and collect product updates
    const productUpdates: { productId: string; newStock: number; shouldMarkOut: boolean }[] = [];

    for (const item of data.items) {
      if (!item.productId) continue;
      
      const dbProd = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (!dbProd) {
        return { error: `Product "${item.name}" not found.` };
      }

      if (!dbProd.inStock || dbProd.stockCount <= 0) {
        return { error: `Sorry, "${item.name}" is out of stock.` };
      }

      if (dbProd.stockCount < item.quantity) {
        return { error: `Sorry, only ${dbProd.stockCount} units of "${item.name}" are in stock. Please adjust your quantity.` };
      }

      const newStock = dbProd.stockCount - item.quantity;
      productUpdates.push({
        productId: item.productId,
        newStock,
        shouldMarkOut: newStock === 0,
      });
    }

    // Generate custom order ID (e.g. ORD-4821)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${randomCode}`;

    // Insert order into database
    await db.insert(orders).values({
      id: orderId,
      tenantId: data.tenantId,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      shippingAddress: data.shippingAddress.trim(),
      customNote: data.customNote.trim() || null,
      totalAmount: data.totalAmount,
      deliveryFee: data.deliveryFee,
      discountAmount: data.discountAmount,
      paymentMethod: data.paymentMethod,
      receiptUrl: data.receiptUrl || "https://picsum.photos/seed/receipt/400/500",
      paymentStatus: "VERIFIED",
      orderStatus: "PENDING",
    });

    // Handle Promo Code Usage
    if (data.promoCodeId) {
      await db
        .update(promoCodes)
        .set({
          usedCount: sql`${promoCodes.usedCount} + 1`,
          isActive: sql`CASE WHEN ${promoCodes.usedCount} + 1 >= ${promoCodes.usageLimit} THEN false ELSE true END`,
          updatedAt: new Date(),
        })
        .where(eq(promoCodes.id, data.promoCodeId));
    }

    // Insert order items
    for (const item of data.items) {
      await db.insert(orderItems).values({
        orderId: orderId,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });
    }

    // Deduct stock in DB
    for (const update of productUpdates) {
      await db
        .update(products)
        .set({
          stockCount: update.newStock,
          inStock: !update.shouldMarkOut,
          updatedAt: new Date(),
        })
        .where(eq(products.id, update.productId));
    }

    return { success: true, orderId: `#${orderId}`, phone: data.customerPhone };
  } catch (error) {
    console.error("Failed to submit order:", error);
    return { error: "Failed to submit order. Please try again." };
  }
}
