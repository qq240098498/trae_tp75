import { Request, Response, NextFunction } from 'express';
import { User } from '../../shared/types.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const AUTH_HEADER = 'x-auth-token';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers[AUTH_HEADER] as string;
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: '未提供认证令牌' 
    });
  }

  try {
    const user = parseToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: '认证令牌无效' 
    });
  }
}

export function roleMiddleware(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '未登录' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: '权限不足' 
      });
    }

    next();
  };
}

export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    exp: Date.now() + 24 * 60 * 60 * 1000
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function parseToken(token: string): User {
  const payload = JSON.parse(Buffer.from(token, 'base64').toString());
  
  if (payload.exp < Date.now()) {
    throw new Error('Token已过期');
  }

  return {
    id: payload.id,
    username: payload.username,
    role: payload.role,
    name: payload.name,
    createTime: 0
  };
}
