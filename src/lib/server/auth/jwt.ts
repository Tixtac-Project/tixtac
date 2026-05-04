// src/lib/server/auth/jwt.ts
import { SignJWT, jwtVerify, EncryptJWT, jwtDecrypt } from 'jose';
import { config } from '$lib/server/config';
import { createHash } from 'node:crypto';
import { Errors, throwError } from '$lib/server/errors';

// 1. Chìa khóa để KÝ JWT (dùng TextEncoder thông thường)
const signSecret = new TextEncoder().encode(config.jwtSecret);

// 2. Chìa khóa để MÃ HÓA JWE (Băm qua SHA-256 để luôn đảm bảo đúng 32 bytes)
const encryptionKey = createHash('sha256').update(config.jwtSecret).digest();

// ==========================================================
// PHẦN 1: AUTH TOKEN (DÙNG ĐỂ ĐĂNG NHẬP - JWT)
// ==========================================================

/**
 * Tạo Token đăng nhập (JWT Signed)
 */
export async function signAuthToken(payload: { sub: number; role: string }): Promise<string> {
  const jwtPayload = {
    role: payload.role,
    sub: payload.sub.toString(), // Chuyển ID số sang chuỗi theo chuẩn JWT
  };

  return await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(signSecret);
}

/**
 * Kiểm tra và giải mã Token đăng nhập
 */
export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, signSecret);
    const sub = Number(payload.sub);

    if (!Number.isFinite(sub)) {
      throwError(Errors.UNAUTHORIZED, 'Invalid token: sub must be a number');
    }

    return { ...payload, sub };
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err;
    throwError(Errors.UNAUTHORIZED, 'Invalid or expired token');
  }
}

// ==========================================================
// PHẦN 2: SEAT ACCESS TOKEN (DÙNG CHO HÀNG CHỜ - JWE)
// ==========================================================

/**
 * Mã hóa hoàn toàn Token giữ chỗ (JWE Encrypted)
 * Sử dụng cho Gatekeeper để bảo vệ API Checkout.
 */
export async function encryptSeatToken(
  payload: {
    userId: number;
    eventId: number;
  },
  expiresInSeconds: number,
): Promise<string> {
  const jwePayload = {
    userId: payload.userId.toString(),
    eventId: payload.eventId,
  };

  return await new EncryptJWT(jwePayload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }) // alg: 'dir' yêu cầu key đúng 32 bytes
    .setIssuedAt()
    .setIssuer('tixtac:queue')
    .setAudience('tixtac:booking')
    .setExpirationTime(`${expiresInSeconds}s`)
    .encrypt(encryptionKey);
}

/**
 * Giải mã Token giữ chỗ (JWE)
 */
export async function decryptSeatToken(token: string) {
  try {
    const { payload } = await jwtDecrypt(token, encryptionKey, {
      issuer: 'tixtac:queue',
      audience: 'tixtac:booking',
    });

    return {
      userId: Number(payload.userId),
      eventId: Number(payload.eventId),
    };
  } catch {
    throwError(Errors.FORBIDDEN, 'Token giữ chỗ không hợp lệ hoặc đã hết hạn');
  }
}
