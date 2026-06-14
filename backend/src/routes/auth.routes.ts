import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../services/audit.service.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new AppError('Невірний email або пароль', 401);
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('Невірний email або пароль', 401);

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError('Невірні дані', 400));
    } else {
      next(err);
    }
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.isActive) throw new AppError('Користувача не знайдено', 404);

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new AppError('Невірний поточний пароль', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    await writeAudit({
      userId: user.id,
      action: 'PASSWORD_CHANGE',
      entityType: 'User',
      entityId: user.id,
      summary: 'Змінено пароль',
    });

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError('Новий пароль — мінімум 6 символів', 400));
    } else {
      next(err);
    }
  }
});

export default router;
