import { NextRequest } from "next/server";
import { db } from "@/db";
import { sellers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setSession } from "@/lib/session";
import { successResponse, errorResponse } from "@/lib/api-helper";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Please fill in both email and password fields.", 400);
    }

    const sellerRecord = await db.query.sellers.findFirst({
      where: eq(sellers.email, email.toLowerCase().trim()),
    });

    if (!sellerRecord) {
      return errorResponse("Invalid email or password.", 401);
    }

    const hashed = hashPassword(password);
    if (sellerRecord.passwordHash !== hashed) {
      return errorResponse("Invalid email or password.", 401);
    }

    // Set session
    await setSession({
      sellerId: sellerRecord.id,
      tenantId: sellerRecord.tenantId,
      email: sellerRecord.email,
    });

    return successResponse({
      sellerId: sellerRecord.id,
      tenantId: sellerRecord.tenantId,
      email: sellerRecord.email,
    });
  } catch (error: any) {
    console.error("API login error:", error);
    return errorResponse("An unexpected error occurred during login.", 500);
  }
}
