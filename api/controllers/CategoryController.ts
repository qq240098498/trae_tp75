import type { Request, Response } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import type { ApiResponse, Category, PaginatedResponse } from '../../shared/types.js';

export class CategoryController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const countResult = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM categories'
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const items = query<Category>(
        'SELECT * FROM categories ORDER BY sort ASC, id DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );

      res.json({
        success: true,
        data: { items, total, page, pageSize } as PaginatedResponse<Category>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<Category>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取品类列表失败'
      } as ApiResponse);
    }
  }

  static async tree(req: Request, res: Response): Promise<void> {
    try {
      const allCategories = query<Category>(
        'SELECT * FROM categories ORDER BY sort ASC, id DESC'
      );

      const categoryMap = new Map<number, Category>();
      allCategories.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      const rootCategories: Category[] = [];
      categoryMap.forEach(cat => {
        if (cat.parentId === null) {
          rootCategories.push(cat);
        } else {
          const parent = categoryMap.get(cat.parentId);
          if (parent && parent.children) {
            parent.children.push(cat);
          }
        }
      });

      res.json({
        success: true,
        data: rootCategories,
        message: '获取成功'
      } as ApiResponse<Category[]>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取品类树失败'
      } as ApiResponse);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      const category = queryOne<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );

      if (!category) {
        res.status(404).json({
          success: false,
          message: '品类不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: category,
        message: '获取成功'
      } as ApiResponse<Category>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取品类失败'
      } as ApiResponse);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, parentId, level, sort } = req.body;

      if (!name || !level) {
        res.status(400).json({
          success: false,
          message: '名称和级别不能为空'
        } as ApiResponse);
        return;
      }

      const result = execute(
        'INSERT INTO categories (name, parent_id, level, sort) VALUES (?, ?, ?, ?)',
        [name, parentId || null, level, sort || 0]
      );

      const newCategory = queryOne<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [result.lastInsertRowid]
      );

      res.json({
        success: true,
        data: newCategory,
        message: '创建成功'
      } as ApiResponse<Category>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建品类失败'
      } as ApiResponse);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { name, parentId, level, sort } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      if (!name || !level) {
        res.status(400).json({
          success: false,
          message: '名称和级别不能为空'
        } as ApiResponse);
        return;
      }

      const existing = queryOne<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '品类不存在'
        } as ApiResponse);
        return;
      }

      execute(
        'UPDATE categories SET name = ?, parent_id = ?, level = ?, sort = ? WHERE id = ?',
        [name, parentId || null, level, sort || existing.sort, id]
      );

      const updated = queryOne<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: updated,
        message: '更新成功'
      } as ApiResponse<Category>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新品类失败'
      } as ApiResponse);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      const existing = queryOne<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '品类不存在'
        } as ApiResponse);
        return;
      }

      const childCount = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
        [id]
      );

      if (childCount && childCount.count > 0) {
        res.status(400).json({
          success: false,
          message: '该品类下有子品类，无法删除'
        } as ApiResponse);
        return;
      }

      const productCount = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
        [id]
      );

      if (productCount && productCount.count > 0) {
        res.status(400).json({
          success: false,
          message: '该品类下有商品，无法删除'
        } as ApiResponse);
        return;
      }

      execute('DELETE FROM categories WHERE id = ?', [id]);

      res.json({
        success: true,
        message: '删除成功'
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除品类失败'
      } as ApiResponse);
    }
  }
}
