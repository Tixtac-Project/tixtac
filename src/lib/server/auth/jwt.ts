import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

export function signAuthToken(payload: { sub: number; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h'});
}

export function verifyAuthToken(toke: string) {
  try {
    return jwt.verify(toke, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
