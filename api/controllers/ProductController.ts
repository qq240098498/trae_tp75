import type { Request, Response } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import type { ApiResponse, Product, PaginatedResponse } from '../../shared/types.js';

export class ProductController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const keyword = req.query.keyword as string;
      const categoryId = req.query.categoryId as string;

      let where = '';
      const params: any[] = [];

      if (keyword) {
        where += 'WHERE (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      if (categoryId) {
        where += where ? ' AND p.category_id = ?' : 'WHERE p.category_id = ?';
        params.push(parseInt(categoryId));
      }

      const countResult = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM products p ${where}`,
        params
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const items = query<Product>(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         ${where} 
         ORDER BY p.id DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: { items, total, page, pageSize } as PaginatedResponse<Product>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<Product>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取商品列表失败'
      } as ApiResponse);
    }
  }

  static async getByBarcode(req: Request, res: Response): Promise<void> {
    try {
      const barcode = req.params.barcode;

      if (!barcode) {
        res.status(400).json({
          success: false,
          message: '条码不能为空'
        } as ApiResponse);
        return;
      }

      const product = queryOne<Product>(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.barcode = ?`,
        [barcode]
      );

      if (!product) {
        res.status(404).json({
          success: false,
          message: '商品不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: product,
        message: '获取成功'
      } as ApiResponse<Product>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '查询商品失败'
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

      const product = queryOne<Product>(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = ?`,
        [id]
      );

      if (!product) {
        res.status(404).json({
          success: false,
          message: '商品不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: product,
        message: '获取成功'
      } as ApiResponse<Product>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取商品失败'
      } as ApiResponse);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        sku, name, categoryId, barcode, unitType, baseUnit, saleUnit,
        wholeUnit, unitRate, wholeRate, pieceWeight, retailPrice,
        wholesalePrice, costPrice, minUnitPrice, stock, warningStock
      } = req.body;

      if (!sku || !name || !categoryId || !unitType || !baseUnit || !saleUnit) {
        res.status(400).json({
          success: false,
          message: '必填字段不能为空'
        } as ApiResponse);
        return;
      }

      const existingSku = queryOne<Product>(
        'SELECT id FROM products WHERE sku = ?',
        [sku]
      );

      if (existingSku) {
        res.status(400).json({
          success: false,
          message: 'SKU已存在'
        } as ApiResponse);
        return;
      }

      const now = Date.now();

      const result = execute(
        `INSERT INTO products (
          sku, name, category_id, barcode, unit_type, base_unit, sale_unit,
          whole_unit, unit_rate, whole_rate, piece_weight, retail_price,
          wholesale_price, cost_price, min_unit_price, stock, warning_stock,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sku, name, categoryId, barcode || '', unitType, baseUnit, saleUnit,
          wholeUnit || '', unitRate || 1, wholeRate || 1, pieceWeight || 0,
          retailPrice, wholesalePrice, costPrice, minUnitPrice, stock || 0,
          warningStock || 10, now, now
        ]
      );

      const newProduct = queryOne<Product>(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = ?`,
        [result.lastInsertRowid]
      );

      res.json({
        success: true,
        data: newProduct,
        message: '创建成功'
      } as ApiResponse<Product>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建商品失败'
      } as ApiResponse);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const {
        sku, name, categoryId, barcode, unitType, baseUnit, saleUnit,
        wholeUnit, unitRate, wholeRate, pieceWeight, retailPrice,
        wholesalePrice, costPrice, minUnitPrice, stock, warningStock
      } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      if (!sku || !name || !categoryId || !unitType || !baseUnit || !saleUnit) {
        res.status(400).json({
          success: false,
          message: '必填字段不能为空'
        } as ApiResponse);
        return;
      }

      const existing = queryOne<Product>(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '商品不存在'
        } as ApiResponse);
        return;
      }

      const existingSku = queryOne<Product>(
        'SELECT id FROM products WHERE sku = ? AND id != ?',
        [sku, id]
      );

      if (existingSku) {
        res.status(400).json({
          success: false,
          message: 'SKU已存在'
        } as ApiResponse);
        return;
      }

      const now = Date.now();

      execute(
        `UPDATE products SET 
          sku = ?, name = ?, category_id = ?, barcode = ?, unit_type = ?, 
          base_unit = ?, sale_unit = ?, whole_unit = ?, unit_rate = ?, 
          whole_rate = ?, piece_weight = ?, retail_price = ?, wholesale_price = ?, 
          cost_price = ?, min_unit_price = ?, stock = ?, warning_stock = ?, 
          update_time = ? 
         WHERE id = ?`,
        [
          sku, name, categoryId, barcode || '', unitType, baseUnit, saleUnit,
          wholeUnit || '', unitRate || 1, wholeRate || 1, pieceWeight || 0,
          retailPrice, wholesalePrice, costPrice, minUnitPrice,
          stock !== undefined ? stock : existing.stock,
          warningStock !== undefined ? warningStock : existing.warningStock,
          now, id
        ]
      );

      const updated = queryOne<Product>(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = ?`,
        [id]
      );

      res.json({
        success: true,
        data: updated,
        message: '更新成功'
      } as ApiResponse<Product>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新商品失败'
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

      const existing = queryOne<Product>(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '商品不存在'
        } as ApiResponse);
        return;
      }

      execute('DELETE FROM products WHERE id = ?', [id]);

      res.json({
        success: true,
        message: '删除成功'
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除商品失败'
      } as ApiResponse);
    }
  }

  static async lowStock(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const countResult = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM products WHERE stock <= warning_stock'
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const items = query<Product>(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.stock <= p.warning_stock 
         ORDER BY p.stock ASC 
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      res.json({
        success: true,
        data: { items, total, page, pageSize } as PaginatedResponse<Product>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<Product>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取库存预警商品失败'
      } as ApiResponse);
    }
  }
}
