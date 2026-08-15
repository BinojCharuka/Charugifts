import { NextRequest } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import {
  resolveTenantForRequest,
  authenticateSeller,
  successResponse,
  errorResponse,
} from "@/lib/api-helper";

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenantForRequest(req);
    const url = new URL(req.url);
    
    // Parse query params
    const q = url.searchParams.get("q");
    const inStockParam = url.searchParams.get("inStock");
    const limitParam = parseInt(url.searchParams.get("limit") || "50");
    const offsetParam = parseInt(url.searchParams.get("offset") || "0");

    const conditions = [eq(products.tenantId, tenant.id)];

    if (q) {
      conditions.push(
        or(
          ilike(products.name, `%${q}%`),
          ilike(products.description || "", `%${q}%`)
        ) as any
      );
    }

    if (inStockParam !== null && inStockParam !== undefined) {
      const inStock = inStockParam === "true";
      conditions.push(eq(products.inStock, inStock));
    }

    const items = await db.query.products.findMany({
      where: and(...conditions),
      orderBy: [desc(products.createdAt)],
      limit: isNaN(limitParam) ? 50 : limitParam,
      offset: isNaN(offsetParam) ? 0 : offsetParam,
    });

    return successResponse({
      tenantId: tenant.id,
      shopName: tenant.shopName,
      count: items.length,
      products: items,
    });
  } catch (error: any) {
    console.error("API get products error:", error);
    return errorResponse("Failed to fetch products.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Seller
    const session = await authenticateSeller();
    if (!session) {
      return errorResponse("Unauthorized. Please log in first.", 401);
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { name, description, price, inStock, imageUrl } = body;

    if (!name || price === undefined || price === null) {
      return errorResponse("Missing required fields: name and price are required.", 400);
    }

    // Validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return errorResponse("Invalid price. Price must be a positive number.", 400);
    }

    // 3. Create Product
    const newProduct = await db.insert(products).values({
      tenantId: session.tenantId,
      name: name.trim(),
      description: description ? description.trim() : null,
      price: parsedPrice.toFixed(2),
      inStock: inStock !== false, // defaults to true
      imageUrl: imageUrl ? imageUrl.trim() : null,
    }).returning();

    return successResponse({
      message: "Product created successfully",
      product: newProduct[0],
    }, 201);
  } catch (error: any) {
    console.error("API create product error:", error);
    return errorResponse("An error occurred while creating product.", 500);
  }
}
