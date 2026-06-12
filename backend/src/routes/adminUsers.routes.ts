import { Router, Response } from 'express';
import {
  AdminRequest,
  adminAuthMiddleware,
  requirePermission,
} from '../middleware/adminAuth.js';
import { supabaseAdmin } from '../database/supabase.js';

const router = Router();

// GET /api/admin/users (listar usuários)
router.get(
  '/',
  adminAuthMiddleware,
  requirePermission('manage_users'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const { data, error, count } = await supabaseAdmin
        .from('users')
        .select('id, email, cpf, tier, subscription_active, created_at', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) throw error;

      res.json({
        success: true,
        data: {
          items: data,
          total: count,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// PUT /api/admin/users/:userId/subscription (ajusta subscrição)
router.put(
  '/:userId/subscription',
  adminAuthMiddleware,
  requirePermission('manage_billing'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { tier, subscription_active, subscription_end_date } = req.body;

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          tier,
          subscription_active,
          subscription_end_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id, email, tier, subscription_active, subscription_end_date')
        .single();

      if (error) throw error;

      // Log
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: req.admin!.id,
        action: 'update_user_subscription',
        resource_type: 'user',
        resource_id: userId,
        details: { tier, subscription_active, subscription_end_date },
      });

      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// DELETE /api/admin/users/:userId (soft delete)
router.delete(
  '/:userId',
  adminAuthMiddleware,
  requirePermission('manage_users'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Soft delete: marca como inativo
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          subscription_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Log
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: req.admin!.id,
        action: 'delete_user',
        resource_type: 'user',
        resource_id: userId,
      });

      res.json({
        success: true,
        message: 'Usuário desativado',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

export default router;
