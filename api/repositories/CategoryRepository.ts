import { BaseRepository } from './BaseRepository.js';
import { query } from '../db/index.js';
import type { Category } from '../../shared/types.js';

export class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super('categories');
  }

  findTree(): Category[] {
    const all = this.findAll('', [], 'sort ASC, id ASC');
    const map = new Map<number, Category>();
    const roots: Category[] = [];

    all.forEach(category => {
      category.children = [];
      map.set(category.id, category);
    });

    all.forEach(category => {
      if (category.parentId === null) {
        roots.push(category);
      } else {
        const parent = map.get(category.parentId);
        if (parent) {
          parent.children!.push(category);
        }
      }
    });

    return roots;
  }

  findByLevel(level: 1 | 2 | 3): Category[] {
    return this.findAll('level = ?', [level], 'sort ASC, id ASC');
  }

  findByParentId(parentId: number): Category[] {
    return this.findAll('parent_id = ?', [parentId], 'sort ASC, id ASC');
  }
}
