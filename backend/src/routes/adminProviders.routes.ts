import { Router, Response } from 'express';
import {
  AdminRequest,
  adminAuthMiddleware,
  requirePermission,
} from '../middleware/adminAuth.js';
import { supabaseAdmin } from '../database/supabase.js';

const router = Router();

// GET /api/admin/providers (listar todos)
router.get(
  '/',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('streaming_providers')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;

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

// GET /api/admin/providers/:id (detalhes)
router.get(
  '/:id',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from('streaming_providers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

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

// PUT /api/admin/providers/:id (atualizar)
router.put(
  '/:id',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        display_name,
        description,
        api_base_url,
        priority,
        is_active,
        config,
      } = req.body;

      const { data, error } = await supabaseAdmin
        .from('streaming_providers')
        .update({
          name,
          display_name,
          description,
          api_base_url,
          priority,
          is_active,
          config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: req.admin!.id,
        action: 'update_provider',
        resource_type: 'provider',
        resource_id: id,
        details: { updated_fields: Object.keys(req.body) },
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

// DELETE /api/admin/providers/:id (soft delete)
router.delete(
  '/:id',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = await supabaseAdmin
        .from('streaming_providers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Log
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: req.admin!.id,
        action: 'delete_provider',
        resource_type: 'provider',
        resource_id: id,
      });

      res.json({
        success: true,
        message: 'Provider desativado',
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
