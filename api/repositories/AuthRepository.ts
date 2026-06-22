import { BaseRepository } from './BaseRepository.js';
import { User } from '../../shared/types.js';

export class AuthRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  findByUsername(username: string): User | null {
    return this.findOne('username = ?', [username]);
  }
}
