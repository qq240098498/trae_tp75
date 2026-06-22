import type { Request, Response } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import type { ApiResponse, Supplier, PaginatedResponse } from '../../shared/types.js';

export class SupplierController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const keyword = req.query.keyword as string;
      const creditRating = req.query.creditRating as string;

      let where = '';
      const params: any[] = [];

      if (keyword) {
        where += 'WHERE (name LIKE ? OR contact LIKE ? OR phone LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      if (creditRating) {
        where += where ? ' AND credit_rating = ?' : 'WHERE credit_rating = ?';
        params.push(creditRating);
      }

      const countResult = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM suppliers ${where}`,
        params
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const items = query<Supplier>(
        `SELECT * FROM suppliers ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: { items, total, page, pageSize } as PaginatedResponse<Supplier>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<Supplier>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取供应商列表失败'
      } as ApiResponse);
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const items = query<Supplier>(
        'SELECT * FROM suppliers ORDER BY name ASC'
      );

      res.json({
        success: true,
        data: items,
        message: '获取成功'
      } as ApiResponse<Supplier[]>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取供应商列表失败'
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

      const supplier = queryOne<Supplier>(
        'SELECT * FROM suppliers WHERE id = ?',
        [id]
      );

      if (!supplier) {
        res.status(404).json({
          success: false,
          message: '供应商不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: supplier,
        message: '获取成功'
      } as ApiResponse<Supplier>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取供应商失败'
      } as ApiResponse);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, contact, phone, address, mainCategory, creditRating, remark } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: '供应商名称不能为空'
        } as ApiResponse);
        return;
      }

      const now = Date.now();

      const result = execute(
        `INSERT INTO suppliers (
          name, contact, phone, address, main_category, credit_rating, remark, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, contact || '', phone || '', address || '', mainCategory || '', creditRating || 'B', remark || '', now]
      );

      const newSupplier = queryOne<Supplier>(
        'SELECT * FROM suppliers WHERE id = ?',
        [result.lastInsertRowid]
      );

      res.json({
        success: true,
        data: newSupplier,
        message: '创建成功'
      } as ApiResponse<Supplier>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建供应商失败'
      } as ApiResponse);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { name, contact, phone, address, mainCategory, creditRating, remark } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: '供应商名称不能为空'
        } as ApiResponse);
        return;
      }

      const existing = queryOne<Supplier>(
        'SELECT * FROM suppliers WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '供应商不存在'
        } as ApiResponse);
        return;
      }

      execute(
        `UPDATE suppliers SET 
          name = ?, contact = ?, phone = ?, address = ?, 
          main_category = ?, credit_rating = ?, remark = ? 
         WHERE id = ?`,
        [
          name, contact !== undefined ? contact : existing.contact,
          phone !== undefined ? phone : existing.phone,
          address !== undefined ? address : existing.address,
          mainCategory !== undefined ? mainCategory : existing.mainCategory,
          creditRating || existing.creditRating,
          remark !== undefined ? remark : existing.remark, id
        ]
      );

      const updated = queryOne<Supplier>(
        'SELECT * FROM suppliers WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: updated,
        message: '更新成功'
      } as ApiResponse<Supplier>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新供应商失败'
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

      const existing = queryOne<Supplier>(
        'SELECT * FROM suppliers WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '供应商不存在'
        } as ApiResponse);
        return;
      }

      const purchaseCount = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?',
        [id]
      );

      if (purchaseCount && purchaseCount.count > 0) {
        res.status(400).json({
          success: false,
          message: '该供应商下有采购单，无法删除'
        } as ApiResponse);
        return;
      }

      execute('DELETE FROM suppliers WHERE id = ?', [id]);

      res.json({
        success: true,
        message: '删除成功'
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除供应商失败'
      } as ApiResponse);
    }
  }
}
