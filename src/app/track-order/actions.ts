"use server";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function lookupOrder(orderId: string, phone: string) {
  const normalizedId = orderId.trim().replace(/^#/, "");
  const normalizedPhone = phone.trim();

  if (!normalizedId || !normalizedPhone) {
    return { error: "Please enter both Order ID and Phone Number." };
  }

  try {
    const foundOrder = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, normalizedId),
        eq(orders.customerPhone, normalizedPhone)
      ),
      with: {
        items: true,
      },
    });

    if (!foundOrder) {
      return { error: "No order found. Please check your Order ID and phone number." };
    }

    return {
      order: {
        id: `#${foundOrder.id}`,
        date: foundOrder.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        items: foundOrder.items.map((i) => `${i.name} x${i.quantity}`).join(", "),
        total: foundOrder.totalAmount,
        status: foundOrder.orderStatus as "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED",
        customerName: foundOrder.customerName,
        shippingAddress: foundOrder.shippingAddress,
        paymentStatus: foundOrder.paymentStatus as "PENDING" | "VERIFIED" | "REJECTED",
      },
    };
  } catch (error) {
    console.error("Order lookup error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
