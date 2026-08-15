import { NextRequest } from "next/server";
import { authenticateSeller, successResponse, errorResponse } from "@/lib/api-helper";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateSeller();
    if (!session) {
      return errorResponse("Unauthorized. No active session found.", 401);
    }
    return successResponse({
      authenticated: true,
      sellerId: session.sellerId,
      tenantId: session.tenantId,
      email: session.email,
    });
  } catch (error) {
    console.error("API me error:", error);
    return errorResponse("An error occurred checking the session status.", 500);
  }
}
