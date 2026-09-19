import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../src/types';
import { store } from './store';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const user = store.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired authorization token.' });
  }

  req.user = user;
  next();
}

export function optionalAuthenticateUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    const user = store.getUserByToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role === 'super_admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access Denied. Role '${req.user.role}' does not possess required privilege. Required: ${allowedRoles.join(', ')}`,
    });
  };
}
