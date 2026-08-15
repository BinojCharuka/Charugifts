import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "lumina-gifts-super-secret-key-32-chars-long"
);

const ACCESS_COOKIE = "lumina_access_token";
const REFRESH_COOKIE = "lumina_refresh_token";

export async function signJwt(payload: any, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  
  const payload = await verifyJwt(token);
  if (!payload) return null;
  
  return payload as unknown as { sellerId: string; tenantId: string; email: string };
}

export async function setSession(data: { sellerId: string; tenantId: string; email: string }) {
  const accessToken = await signJwt(data, "15m");
  const refreshToken = await signJwt(data, "7d");
  
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  
  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 15 * 60, // 15 mins
    path: "/",
  });
  
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete("lumina_session");
}
