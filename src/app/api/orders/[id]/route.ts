import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  authenticateSeller,
  successResponse,
  errorResponse,
} from "@/lib/api-helper";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const phoneParam = url.searchParams.get("phone");

    const session = await authenticateSeller();

    // 1. If seller is authenticated, retrieve the order and check tenant ownership
    if (session) {
      const order = await db.query.orders.findFirst({
        where: and(eq(orders.id, id), eq(orders.tenantId, session.tenantId)),
        with: {
          items: true,
        },
      });

      if (!order) {
        return errorResponse("Order not found or access denied.", 404);
      }

      return successResponse(order);
    }

    // 2. If seller is NOT authenticated, check if the request is a customer tracking lookup
    if (phoneParam) {
      const order = await db.query.orders.findFirst({
        where: and(
          eq(orders.id, id),
          eq(orders.customerPhone, phoneParam.trim())
        ),
        with: {
          items: true,
        },
      });

      if (!order) {
        return errorResponse("Order not found or invalid phone number.", 404);
      }

      // Return a safer sub-set of order info for public tracking lookup
      return successResponse({
        id: `#${order.id}`,
        date: order.createdAt,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus,
        customerName: order.customerName,
        shippingAddress: order.shippingAddress,
        totalAmount: order.totalAmount,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      });
    }

    return errorResponse("Unauthorized. Please login or provide a phone number for tracking.", 401);
  } catch (error) {
    console.error("API get order error:", error);
    return errorResponse("An error occurred while retrieving the order.", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate Seller
    const session = await authenticateSeller();
    if (!session) {
      return errorResponse("Unauthorized. Please log in first.", 401);
    }

    // 2. Check ownership
    const existingOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.tenantId, session.tenantId)),
    });

    if (!existingOrder) {
      return errorResponse("Order not found or access denied.", 404);
    }

    // 3. Parse request body
    const body = await req.json().catch(() => ({}));
    const { paymentStatus, orderStatus, customerName, customerPhone, shippingAddress, customNote } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Validations for status enums
    if (paymentStatus) {
      const upperPayment = paymentStatus.toUpperCase();
      if (!["PENDING", "VERIFIED", "REJECTED"].includes(upperPayment)) {
        return errorResponse("Invalid payment status. Must be PENDING, VERIFIED, or REJECTED.", 400);
      }
      updateData.paymentStatus = upperPayment;
    }

    if (orderStatus) {
      const upperOrder = orderStatus.toUpperCase();
      if (!["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"].includes(upperOrder)) {
        return errorResponse("Invalid order status. Must be PENDING, PROCESSING, SHIPPED, or DELIVERED.", 400);
      }
      updateData.orderStatus = upperOrder;
    }

    // Support updating general order fields if requested
    if (customerName !== undefined) updateData.customerName = customerName.trim();
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone.trim();
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress.trim();
    if (customNote !== undefined) updateData.customNote = customNote ? customNote.trim() : null;

    // 4. Update Database
    const updatedOrder = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    return successResponse({
      message: "Order updated successfully",
      order: updatedOrder[0],
    });
  } catch (error) {
    console.error("API update order error:", error);
    return errorResponse("An error occurred while updating the order.", 500);
  }
}
