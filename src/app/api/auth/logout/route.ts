import { NextRequest } from "next/server";
import { clearSession } from "@/lib/session";
import { successResponse, errorResponse } from "@/lib/api-helper";

export async function POST(req: NextRequest) {
  try {
    await clearSession();
    return successResponse({ message: "Successfully logged out" });
  } catch (error) {
    console.error("API logout error:", error);
    return errorResponse("An error occurred during logout.", 500);
  }
}
