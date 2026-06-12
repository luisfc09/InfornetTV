import './config/env.js'; // DEVE ser o primeiro import — carrega o .env antes de db.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { APIResponse } from './types/index.js';
import { ContentService } from './services/ContentService.js';
import { DB_ENABLED, pingDb } from './database/db.js';
import authRoutes from './routes/auth.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import adminProvidersRoutes from './routes/adminProviders.routes.js';
import adminUsersRoutes from './routes/adminUsers.routes.js';
import adminStatsRoutes from './routes/adminStats.routes.js';
import adminDudaRoutes from './routes/adminDuda.routes.js';
import watchRoutes from './routes/watch.routes.js';
import {
  adminAuthMiddleware,
  requirePermission,
} from './middleware/adminAuth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Services
const contentService = new ContentService();

// ============ ROUTES ============

// Health check
app.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    db: DB_ENABLED ? (await pingDb()) ? 'connected' : 'configured_unreachable' : 'disabled',
    timestamp: new Date().toISOString(),
  });
});

// ── ROTAS ADMIN (JWT próprio — ADMIN_JWT_SECRET) ─────────────────────────
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/providers', adminProvidersRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/duda', adminDudaRoutes);

// Rotas de autenticação (usuários do app)
app.use('/api/auth', authRoutes);

// Consumo do assinante: POST /api/watch/progress + GET /api/recommendations
app.use('/api', watchRoutes);

// Sincroniza o catálogo dos providers para o banco (requer DATABASE_URL).
// Agora protegido pelo JWT de ADMIN (não aceita mais token de usuário).
app.post(
  '/api/admin/sync',
  adminAuthMiddleware,
  requirePermission('manage_providers'),
  async (req: Request, res: Response) => {
  try {
    const count = await contentService.syncCatalog();
    res.json({
      success: true,
      data: { synced: count },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Get all content
app.get('/api/content', async (req: Request, res: Response) => {
  try {
    const { genre, limit = 50 } = req.query;

    let content;
    if (genre) {
      content = await contentService.getContentByGenre(genre as string);
    } else {
      content = await contentService.getAllContent();
    }

    const response: APIResponse<any> = {
      success: true,
      data: {
        items: content.slice(0, Number(limit)),
        total: content.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Search content
// IMPORTANTE: rotas literais (/search, /trending) DEVEM vir antes da rota
// paramétrica /:id — senão o Express captura "search"/"trending" como :id.
app.get('/api/content/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters',
        timestamp: new Date().toISOString(),
      });
    }

    const results = await contentService.searchContent(q as string);

    res.json({
      success: true,
      data: {
        items: results,
        total: results.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Get trending
app.get('/api/content/trending', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const trending = await contentService.getTrendingContent(Number(limit));

    res.json({
      success: true,
      data: {
        items: trending,
        total: trending.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Get content by ID
app.get('/api/content/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const content = await contentService.getContentDetail(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// ── SPA estática ─────────────────────────────────────────────────────────
// Em produção (deploy de serviço único) o backend serve o build do frontend.
// dist/server.js -> ../../frontend/dist (na raiz do monorepo).
const FRONTEND_DIST = join(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // Fallback do roteamento client-side: tudo que não for /api volta o index.html.
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(FRONTEND_DIST, 'index.html'));
  });
  console.log(`🖥️  Servindo SPA de ${FRONTEND_DIST}`);
}

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📺 GET http://localhost:${PORT}/api/content`);
});
