import { Router } from 'express';
import type { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'DIRECTOR'));

router.get('/', async (req, res, next) => {
  try {
    const action = req.query.action as AuditAction | undefined;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(
      logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
