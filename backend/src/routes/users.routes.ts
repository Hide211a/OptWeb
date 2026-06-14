import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';
import { writeAudit } from '../services/audit.service.js';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN'));

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  fullName: z.string().min(1),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = userSchema.parse(req.body);
    if (!data.password) throw new AppError('Пароль обовʼязковий', 400);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        isActive: data.isActive ?? true,
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: user.id,
      summary: `Створено користувача ${user.fullName}`,
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const targetId = paramId(req);
    const data = userSchema.partial().parse(req.body);

    if (targetId === req.user!.id) {
      if (data.isActive === false) {
        throw new AppError('Не можна деактивувати власний обліковий запис', 400);
      }
      if (data.role && data.role !== req.user!.role) {
        throw new AppError('Не можна змінити власну роль', 400);
      }
    }

    const update: Record<string, unknown> = {};
    if (data.email !== undefined) update.email = data.email;
    if (data.fullName !== undefined) update.fullName = data.fullName;
    if (data.role !== undefined) update.role = data.role;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.password) {
      update.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: update,
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: user.id,
      summary: `Оновлено користувача ${user.fullName}`,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
