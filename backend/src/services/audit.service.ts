import type { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export async function writeAudit(params: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      summary: params.summary,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}
