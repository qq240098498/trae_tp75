import { BaseRepository } from './BaseRepository.js';
import type { Supplier } from '../../shared/types.js';

export class SupplierRepository extends BaseRepository<Supplier> {
  constructor() {
    super('suppliers');
  }

  findByName(name: string): Supplier | null {
    return this.findOne('name = ?', [name]);
  }

  searchByName(keyword: string): Supplier[] {
    const likeKeyword = `%${keyword}%`;
    return this.findAll(
      'name LIKE ? OR contact LIKE ? OR phone LIKE ? OR main_category LIKE ?',
      [likeKeyword, likeKeyword, likeKeyword, likeKeyword]
    );
  }

  findByCreditRating(rating: 'A' | 'B' | 'C'): Supplier[] {
    return this.findAll('credit_rating = ?', [rating], 'id DESC');
  }

  findByMainCategory(mainCategory: string): Supplier[] {
    return this.findAll('main_category = ?', [mainCategory], 'id DESC');
  }

  search(keyword: string): Supplier[] {
    return this.searchByName(keyword);
  }
}
