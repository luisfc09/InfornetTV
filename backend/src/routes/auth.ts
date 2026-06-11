// Rotas de autenticação: cadastro, login e perfil do usuário logado.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const auth = new AuthService();

const registerSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.'),
  cpf: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha obrigatória.'),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(' '),
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await auth.register(
      parsed.data.email,
      parsed.data.password,
      parsed.data.cpf,
    );
    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = (error as any).status ?? 500;
    res.status(status).json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(' '),
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await auth.login(parsed.data.email, parsed.data.password);
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = (error as any).status ?? 500;
    res.status(status).json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/auth/me — dados do token (rota protegida, útil para validar o JWT)
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: req.user,
    timestamp: new Date().toISOString(),
  });
});

export default router;
