import { Router, Request, Response } from 'express';
import { AdminAuthService } from '../services/AdminAuthService.js';
import {
  adminAuthMiddleware,
  requirePermission,
  AdminRequest,
} from '../middleware/adminAuth.js';

const router = Router();
const authService = new AdminAuthService();

// POST /api/admin/auth/login (público)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha obrigatórios',
      });
    }

    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// POST /api/admin/auth/change-password (protegido)
router.post(
  '/change-password',
  adminAuthMiddleware,
  async (req: AdminRequest, res: Response) => {
    try {
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Senha deve ter pelo menos 8 caracteres',
        });
      }

      await authService.changePassword(req.admin!.id, newPassword);

      res.json({
        success: true,
        message: 'Senha alterada com sucesso',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// POST /api/admin/auth/create-admin (super_admin ou permissão manage_admin_users)
router.post(
  '/create-admin',
  adminAuthMiddleware,
  requirePermission('manage_admin_users'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { email, password, fullName, role, permissions } = req.body;

      if (!email || !password || !fullName || !role) {
        return res.status(400).json({
          success: false,
          error: 'email, password, fullName e role são obrigatórios',
        });
      }

      const newAdmin = await authService.createAdmin(
        email,
        password,
        fullName,
        role,
        permissions ?? [],
        req.admin!.id,
      );

      res.status(201).json({
        success: true,
        data: newAdmin,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

export default router;
