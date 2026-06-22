import { AuthRepository } from '../repositories/AuthRepository.js';
import { User, LoginResponse } from '../../shared/types.js';
import crypto from 'crypto';

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  login(username: string, password: string): LoginResponse {
    const user = this.authRepository.findByUsername(username);
    if (!user) {
      throw new Error('用户名或密码错误');
    }

    const hashedPassword = this.hashPassword(password);
    const storedPassword = this.getStoredPassword(username);
    
    if (hashedPassword !== storedPassword) {
      throw new Error('用户名或密码错误');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        createTime: user.createTime
      }
    };
  }

  verifyToken(token: string): User | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const data = JSON.parse(decoded);
      
      if (data.expireTime < Date.now()) {
        return null;
      }

      const user = this.authRepository.findById(data.userId);
      return user;
    } catch (error) {
      return null;
    }
  }

  private hashPassword(password: string): string {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  private getStoredPassword(username: string): string {
    const defaultPasswords: Record<string, string> = {
      'admin': this.hashPassword('admin123'),
      'cashier': this.hashPassword('cashier123'),
      'stock': this.hashPassword('stock123')
    };
    return defaultPasswords[username] || '';
  }

  private generateToken(user: User): string {
    const data = {
      userId: user.id,
      username: user.username,
      expireTime: Date.now() + 24 * 60 * 60 * 1000
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }
}
