import { NextRequest } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
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

    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return errorResponse("Product not found.", 404);
    }

    return successResponse(product);
  } catch (error) {
    console.error("API get product by id error:", error);
    return errorResponse("Failed to fetch product.", 500);
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

    // 2. Retrieve existing product to ensure ownership
    const existingProduct = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.tenantId, session.tenantId)),
    });

    if (!existingProduct) {
      return errorResponse("Product not found or access denied.", 404);
    }

    // 3. Parse request body
    const body = await req.json().catch(() => ({}));
    const { name, description, price, inStock, imageUrl } = body;

    // Prepare update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (inStock !== undefined) updateData.inStock = Boolean(inStock);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? imageUrl.trim() : null;

    if (price !== undefined && price !== null) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return errorResponse("Invalid price. Price must be a positive number.", 400);
      }
      updateData.price = parsedPrice.toFixed(2);
    }

    // 4. Update Database
    const updatedProduct = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    return successResponse({
      message: "Product updated successfully",
      product: updatedProduct[0],
    });
  } catch (error) {
    console.error("API update product error:", error);
    return errorResponse("An error occurred while updating product.", 500);
  }
}

export async function DELETE(
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

    // 2. Retrieve existing product to ensure ownership
    const existingProduct = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.tenantId, session.tenantId)),
    });

    if (!existingProduct) {
      return errorResponse("Product not found or access denied.", 404);
    }

    // 3. Delete from DB
    await db.delete(products).where(eq(products.id, id));

    return successResponse({
      message: "Product deleted successfully",
      id: id,
    });
  } catch (error) {
    console.error("API delete product error:", error);
    return errorResponse("An error occurred while deleting product.", 500);
  }
}
