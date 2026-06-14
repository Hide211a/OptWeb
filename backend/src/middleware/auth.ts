import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { AppError } from '../lib/errors.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export function signToken(payload: {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Не авторизовано', 401));
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET) as Request['user'];
    next();
  } catch {
    next(new AppError('Недійсний токен', 401));
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Не авторизовано', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Недостатньо прав', 403));
    }
    next();
  };
}
