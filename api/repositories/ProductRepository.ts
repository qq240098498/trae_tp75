import { BaseRepository } from './BaseRepository.js';
import { query, execute } from '../db/index.js';
import type { Product } from '../../shared/types.js';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products');
  }

  findByBarcode(barcode: string): Product | null {
    return this.findOne('barcode = ?', [barcode]);
  }

  findBySku(sku: string): Product | null {
    return this.findOne('sku = ?', [sku]);
  }

  findByCategoryId(categoryId: number): Product[] {
    return this.findAll('category_id = ?', [categoryId], 'id DESC');
  }

  findWithCategoryName(where: string = '', params: any[] = [], orderBy: string = 'p.id DESC'): Product[] {
    const sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${where ? 'WHERE ' + where : ''}
      ORDER BY ${orderBy}
    `;
    return query<Product>(sql, params);
  }

  findLowStock(): Product[] {
    return this.findWithCategoryName('p.stock <= p.warning_stock', [], 'p.stock ASC');
  }

  search(keyword: string): Product[] {
    const likeKeyword = `%${keyword}%`;
    return this.findWithCategoryName(
      'p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?',
      [likeKeyword, likeKeyword, likeKeyword]
    );
  }

  updateStock(id: number, quantity: number): boolean {
    const result = execute(
      'UPDATE products SET stock = stock + ?, update_time = ? WHERE id = ?',
      [quantity, Date.now(), id]
    );
    return result.changes > 0;
  }
}
