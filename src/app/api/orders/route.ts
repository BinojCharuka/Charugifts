import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import {
  resolveTenantForRequest,
  authenticateSeller,
  successResponse,
  errorResponse,
} from "@/lib/api-helper";

// GET /api/orders (admin only - list orders)
export async function GET(req: NextRequest) {
  try {
    const session = await authenticateSeller();
    if (!session) {
      return errorResponse("Unauthorized. Please log in first.", 401);
    }

    const url = new URL(req.url);
    const paymentStatus = url.searchParams.get("paymentStatus");
    const orderStatus = url.searchParams.get("orderStatus");
    const q = url.searchParams.get("q");
    const limitParam = parseInt(url.searchParams.get("limit") || "50");
    const offsetParam = parseInt(url.searchParams.get("offset") || "0");

    const conditions = [eq(orders.tenantId, session.tenantId)];

    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus.toUpperCase()));
    }

    if (orderStatus) {
      conditions.push(eq(orders.orderStatus, orderStatus.toUpperCase()));
    }

    if (q) {
      conditions.push(
        or(
          ilike(orders.customerName, `%${q}%`),
          ilike(orders.customerPhone, `%${q}%`),
          ilike(orders.id, `%${q}%`)
        ) as any
      );
    }

    const tenantOrders = await db.query.orders.findMany({
      where: and(...conditions),
      orderBy: [desc(orders.createdAt)],
      limit: isNaN(limitParam) ? 50 : limitParam,
      offset: isNaN(offsetParam) ? 0 : offsetParam,
      with: {
        items: true,
      },
    });

    return successResponse({
      count: tenantOrders.length,
      orders: tenantOrders,
    });
  } catch (error) {
    console.error("API get orders error:", error);
    return errorResponse("Failed to fetch orders.", 500);
  }
}

// POST /api/orders (public - submit order)
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenantForRequest(req);
    const body = await req.json().catch(() => ({}));
    
    const {
      customerName,
      customerPhone,
      shippingAddress,
      customNote,
      totalAmount,
      receiptUrl,
      items,
    } = body;

    // Validate inputs
    if (!customerName?.trim() || !customerPhone?.trim() || !shippingAddress?.trim()) {
      return errorResponse("Please fill in all shipping details (customerName, customerPhone, shippingAddress).", 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse("Your order must contain at least one item.", 400);
    }

    // Generate custom order ID (e.g. ORD-4821)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${randomCode}`;

    // Calculate total amount if not explicitly provided or validate it
    const finalTotalAmount = totalAmount || items.reduce((acc: number, item: any) => {
      const priceVal = parseFloat(item.price || "0");
      const qty = parseInt(item.quantity || "1");
      return acc + (priceVal * qty);
    }, 0).toFixed(2);

    // Insert order into database
    await db.insert(orders).values({
      id: orderId,
      tenantId: tenant.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      shippingAddress: shippingAddress.trim(),
      customNote: customNote ? customNote.trim() : null,
      totalAmount: finalTotalAmount.toString(),
      receiptUrl: receiptUrl || "https://picsum.photos/seed/receipt/400/500", // simulated slip fallback
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
    });

    // Insert order items
    for (const item of items) {
      if (!item.productId || !item.name || item.price === undefined || !item.quantity) {
        return errorResponse("Each order item must contain productId, name, price, and quantity.", 400);
      }
      await db.insert(orderItems).values({
        orderId: orderId,
        productId: item.productId,
        name: item.name,
        price: parseFloat(item.price).toFixed(2),
        quantity: parseInt(item.quantity),
      });
    }

    return successResponse({
      message: "Order placed successfully.",
      orderId: `#${orderId}`,
      id: orderId,
      customerPhone: customerPhone.trim(),
      totalAmount: finalTotalAmount,
    }, 201);

  } catch (error: any) {
    console.error("API submit order error:", error);
    return errorResponse("An error occurred while submitting order.", 500);
  }
}
