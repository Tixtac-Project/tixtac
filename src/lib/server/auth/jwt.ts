// src/lib/server/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';
import { config } from '$lib/server/config';

const secret = new TextEncoder().encode(config.jwtSecret);

export async function signAuthToken(payload: { sub: number; role: string }): Promise<string> {
  const jwtPayload = {
    role: payload.role,
    sub: payload.sub.toString(),
  };

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
  return token;
}

export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      ...payload,
      sub: Number(payload.sub),
    };
  } catch (error) {
    throw new Error('Invalid or expired token', { cause: error });
  }
}

// Sprint 4: Seat Access Token
export async function signAccessToken(payload: { sub: number; event_id: number }) {
  return new SignJWT({ ...payload, type: 'seat_access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${config.accessTokenDuration}s`)
    .sign(secret);
}
