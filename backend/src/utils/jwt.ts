import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const EXPIRY = process.env.JWT_EXPIRY || '7d';

export function generateToken(payload: JWTPayload): string {
  return jwt.sign({ ...payload }, SECRET, { expiresIn: EXPIRY } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch (err) {
    return null;
  }
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ user_id: userId }, SECRET, { expiresIn: '30d' } as jwt.SignOptions);
}
