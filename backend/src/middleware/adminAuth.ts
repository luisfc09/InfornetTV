// Autenticação do Admin Panel — SEPARADA do auth de usuários.
// Token assinado com ADMIN_JWT_SECRET (distinto de JWT_SECRET): um token de
// usuário do app NUNCA valida aqui, e vice-versa.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../database/supabase.js';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export async function adminAuthMiddleware(
  req: AdminRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido',
      });
    }

    // Fail-closed: sem secret configurado, NINGUÉM entra (um fallback fixo
    // permitiria forjar tokens se a env sumisse em produção).
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      console.error('[adminAuth] ADMIN_JWT_SECRET não configurado');
      return res.status(503).json({
        success: false,
        error: 'Autenticação de admin indisponível',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, secret) as { admin_id?: string };

    // Busca admin no banco (verifica se ainda está ativo)
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role, permissions, is_active')
      .eq('id', decoded.admin_id)
      .single();

    if (error || !admin || !admin.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Admin não encontrado ou inativo',
      });
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
    };

    // Trilha de auditoria: toda requisição autenticada de admin é logada.
    await supabaseAdmin.from('admin_logs').insert({
      admin_id: admin.id,
      action: req.method + ' ' + req.path,
      resource_type: 'request',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      details: {
        method: req.method,
        path: req.path,
        query: req.query,
      },
    });

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Token inválido ou expirado',
    });
  }
}

// Middleware pra verificar permissões específicas
export function requirePermission(permission: string) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    if (req.admin.role === 'super_admin') {
      return next(); // Super admin tem tudo
    }

    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permissão requerida: ${permission}`,
      });
    }

    next();
  };
}
