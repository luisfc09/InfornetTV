// Middleware de autenticação por JWT (header Authorization: Bearer <token>).

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { JWTPayload } from '../types/index.js';

// Estende o Request do Express para carregar o usuário autenticado.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/** Exige um JWT válido. Anexa o payload em req.user ou responde 401. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token ausente. Use Authorization: Bearer <token>.',
      timestamp: new Date().toISOString(),
    });
  }

  const payload = verifyToken(header.slice('Bearer '.length).trim());
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado.',
      timestamp: new Date().toISOString(),
    });
  }

  req.user = payload;
  next();
}
