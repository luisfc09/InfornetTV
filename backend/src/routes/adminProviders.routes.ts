import { Router, Response } from 'express';
import {
  AdminRequest,
  adminAuthMiddleware,
  requirePermission,
} from '../middleware/adminAuth.js';
import { supabaseAdmin } from '../database/supabase.js';
import { ProviderIntegrationService } from '../services/ProviderIntegrationService.js';

const router = Router();
const integration = new ProviderIntegrationService();

// Remove segredos da resposta; expõe só metadados de integração.
function maskProvider(p: Record<string, unknown>) {
  const { api_key_encrypted, api_secret_encrypted, ...rest } = p;
  const config = (p.config ?? {}) as Record<string, unknown>;
  return {
    ...rest,
    integration_type: (config.type as string) ?? 'mock',
    has_credentials: Boolean(api_key_encrypted && api_secret_encrypted),
  };
}

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
        data: (data ?? []).map(maskProvider),
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
        data: maskProvider(data),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// ── Integração com provedor real (Xtream/IPTV) ───────────────────────────

// PUT /api/admin/providers/:id/integration — salva parâmetros + credenciais
router.put(
  '/:id/integration',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { type, api_base_url, username, password, config } = req.body;
      if (type !== 'mock' && type !== 'xtream') {
        return res
          .status(400)
          .json({ success: false, error: "type deve ser 'mock' ou 'xtream'" });
      }
      const result = await integration.save(req.params.id, {
        type,
        api_base_url,
        username,
        password,
        config,
      });
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: req.admin!.id,
        action: 'save_provider_integration',
        resource_type: 'provider',
        resource_id: req.params.id,
        details: { type, api_base_url },
      });
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
);

// POST /api/admin/providers/:id/test — testa a conexão
router.post(
  '/:id/test',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: AdminRequest, res: Response) => {
    try {
      const result = await integration.test(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
);

// POST /api/admin/providers/:id/import — importa o catálogo VOD
router.post(
  '/:id/import',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: AdminRequest, res: Response) => {
    try {
      const limit = Math.min(Number(req.body?.limit) || 200, 1000);
      const result = await integration.importCatalog(req.params.id, limit);
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: req.admin!.id,
        action: 'import_provider_catalog',
        resource_type: 'provider',
        resource_id: req.params.id,
        details: result,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      res.status(status).json({ success: false, error: (error as Error).message });
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
