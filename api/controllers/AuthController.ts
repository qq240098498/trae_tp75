import type { Request, Response } from 'express';
import { queryOne } from '../db/index.js';
import { generateToken } from '../middleware/auth.js';
import type { ApiResponse, LoginResponse, User } from '../../shared/types.js';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        } as ApiResponse);
        return;
      }

      const user = queryOne<User & { passwordHash: string }>(
        'SELECT id, username, password_hash, role, name, create_time FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        res.status(401).json({
          success: false,
          message: '用户不存在'
        } as ApiResponse);
        return;
      }

      if (user.passwordHash !== password) {
        res.status(401).json({
          success: false,
          message: '密码错误'
        } as ApiResponse);
        return;
      }

      const { passwordHash: _, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword as User);

      res.json({
        success: true,
        data: {
          token,
          user: userWithoutPassword
        } as LoginResponse,
        message: '登录成功'
      } as ApiResponse<LoginResponse>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '登录失败'
      } as ApiResponse);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: '退出登录成功'
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '退出登录失败'
      } as ApiResponse);
    }
  }

  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未登录'
        } as ApiResponse);
        return;
      }

      const user = queryOne<User>(
        'SELECT id, username, role, name, create_time FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!user) {
        res.status(401).json({
          success: false,
          message: '用户不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: user,
        message: '获取成功'
      } as ApiResponse<User>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取用户信息失败'
      } as ApiResponse);
    }
  }
}
