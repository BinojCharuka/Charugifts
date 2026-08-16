import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt, signJwt } from "./lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/forgot-password") &&
    !pathname.startsWith("/admin/reset-password")
  ) {
    const accessToken = request.cookies.get("lumina_access_token")?.value;
    const refreshToken = request.cookies.get("lumina_refresh_token")?.value;

    let isAccessTokenValid = false;
    let payload = null;

    if (accessToken) {
      payload = await verifyJwt(accessToken);
      if (payload) {
        isAccessTokenValid = true;
      }
    }

    if (!isAccessTokenValid) {
      // Access token is missing or expired. Let's check refresh token.
      if (!refreshToken) {
        // No refresh token, redirect to login
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      payload = await verifyJwt(refreshToken);
      if (!payload) {
        // Refresh token is invalid/expired, redirect to login
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      // Refresh token is valid! Let's generate a new access token.
      const newAccessToken = await signJwt(
        {
          sellerId: payload.sellerId,
          tenantId: payload.tenantId,
          email: payload.email,
        },
        "15m"
      );

      // Create a response and set the new access token
      const response = NextResponse.next();
      response.cookies.set("lumina_access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60, // 15 mins
        path: "/",
      });

      // We also need to update the request headers so that any Server Components
      // downstream (like app/admin/page.tsx) will read the new access token via cookies().
      request.cookies.set("lumina_access_token", newAccessToken);
      return response;
    }

    // If access token is valid, just proceed normally
    return NextResponse.next();
  }

  // Pass through for other routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
