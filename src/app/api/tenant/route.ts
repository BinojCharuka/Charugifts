import { NextRequest } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  resolveTenantForRequest,
  authenticateSeller,
  successResponse,
  errorResponse,
} from "@/lib/api-helper";

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenantForRequest(req);
    return successResponse(tenant);
  } catch (error: any) {
    console.error("API get tenant error:", error);
    return errorResponse(error.message || "Failed to resolve tenant.", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 1. Authenticate Seller
    const session = await authenticateSeller();
    if (!session) {
      return errorResponse("Unauthorized. Please log in first.", 401);
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { shopName, domainPrefix, bankDetails, logoUrl } = body;

    if (!shopName || !domainPrefix || !bankDetails) {
      return errorResponse("Missing required fields: shopName, domainPrefix, and bankDetails are required.", 400);
    }

    const { bankName, accountName, accountNumber, branch } = bankDetails;
    if (!bankName || !accountName || !accountNumber || !branch) {
      return errorResponse("Missing bank details. Please provide bankName, accountName, accountNumber, and branch.", 400);
    }

    const cleanDomainPrefix = domainPrefix.toLowerCase().trim();

    // 3. Verify domain prefix uniqueness
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.domainPrefix, cleanDomainPrefix),
    });

    if (existingTenant && existingTenant.id !== session.tenantId) {
      return errorResponse("This domain prefix is already taken by another store.", 400);
    }

    // 4. Update Database
    const updated = await db
      .update(tenants)
      .set({
        shopName: shopName.trim(),
        domainPrefix: cleanDomainPrefix,
        bankDetails: {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          branch: branch.trim(),
        },
        logoUrl: logoUrl ? logoUrl.trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, session.tenantId))
      .returning();

    return successResponse({
      message: "Tenant settings updated successfully",
      tenant: updated[0],
    });
  } catch (error: any) {
    console.error("API update tenant error:", error);
    return errorResponse("An error occurred while updating tenant settings.", 500);
  }
}
