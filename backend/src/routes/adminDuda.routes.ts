// Rotas da Duda no Admin Panel: rodar o motor e ver os insights.

import { Router, Response } from 'express';
import {
  AdminRequest,
  adminAuthMiddleware,
  requirePermission,
} from '../middleware/adminAuth.js';
import { DudaService } from '../services/DudaService.js';
import { supabaseAdmin } from '../database/supabase.js';

const router = Router();
const duda = new DudaService();

// POST /api/admin/duda/run — recalcula recomendações de todos os usuários
router.post(
  '/run',
  adminAuthMiddleware,
  requirePermission('view_analytics'),
  async (req: AdminRequest, res: Response) => {
    try {
      const result = await duda.run();

      await supabaseAdmin.from('admin_logs').insert({
        admin_id: req.admin!.id,
        action: 'duda_run',
        resource_type: 'duda',
        details: result,
      });

      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
);

// GET /api/admin/duda/insights — monitoramento por usuário + recomendações
router.get(
  '/insights',
  adminAuthMiddleware,
  requirePermission('view_analytics'),
  async (req: AdminRequest, res: Response) => {
    try {
      const data = await duda.insights();
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
);

export default router;
