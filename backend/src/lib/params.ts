import type { Request } from 'express';

export function paramId(req: Request, key = 'id'): string {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0];
  return String(value);
}
