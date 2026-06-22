import type { Request, Response } from 'express';
import { query, queryOne, execute, beginTransaction, commitTransaction, rollbackTransaction } from '../db/index.js';
import type { ApiResponse, PurchaseOrder, PurchaseOrderItem, PaginatedResponse } from '../../shared/types.js';

export class PurchaseController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = req.query.status as string;
      const stockStatus = req.query.stockStatus as string;
      const supplierId = req.query.supplierId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      let where = '';
      const params: any[] = [];

      if (status) {
        where += 'WHERE po.status = ?';
        params.push(status);
      }

      if (stockStatus) {
        where += where ? ' AND po.stock_status = ?' : 'WHERE po.stock_status = ?';
        params.push(stockStatus);
      }

      if (supplierId) {
        where += where ? ' AND po.supplier_id = ?' : 'WHERE po.supplier_id = ?';
        params.push(parseInt(supplierId));
      }

      if (startDate) {
        where += where ? ' AND po.create_time >= ?' : 'WHERE po.create_time >= ?';
        params.push(parseInt(startDate));
      }

      if (endDate) {
        where += where ? ' AND po.create_time <= ?' : 'WHERE po.create_time <= ?';
        params.push(parseInt(endDate));
      }

      const countResult = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM purchase_orders po ${where}`,
        params
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const orders = query<PurchaseOrder>(
        `SELECT po.*, s.name as supplier_name, u.name as operator_name 
         FROM purchase_orders po 
         LEFT JOIN suppliers s ON po.supplier_id = s.id 
         LEFT JOIN users u ON po.operator_id = u.id 
         ${where} 
         ORDER BY po.create_time DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: { items: orders, total, page, pageSize } as PaginatedResponse<PurchaseOrder>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<PurchaseOrder>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取采购单列表失败'
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

      const order = queryOne<PurchaseOrder>(
        `SELECT po.*, s.name as supplier_name, u.name as operator_name 
         FROM purchase_orders po 
         LEFT JOIN suppliers s ON po.supplier_id = s.id 
         LEFT JOIN users u ON po.operator_id = u.id 
         WHERE po.id = ?`,
        [id]
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: '采购单不存在'
        } as ApiResponse);
        return;
      }

      const items = query<PurchaseOrderItem>(
        'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id ASC',
        [id]
      );

      res.json({
        success: true,
        data: { ...order, items },
        message: '获取成功'
      } as ApiResponse<PurchaseOrder>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取采购单详情失败'
      } as ApiResponse);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId, items, totalAmount, paidAmount, payMethod, operatorId } = req.body;

      if (!supplierId || !items || !items.length || !operatorId) {
        res.status(400).json({
          success: false,
          message: '供应商、商品列表和操作人不能为空'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        const orderNo = `PO${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const now = Date.now();

        let status: 'pending' | 'partial' | 'paid' = 'pending';
        if (paidAmount >= totalAmount) {
          status = 'paid';
        } else if (paidAmount > 0) {
          status = 'partial';
        }

        const orderResult = execute(
          `INSERT INTO purchase_orders (
            order_no, supplier_id, total_amount, paid_amount, pay_method,
            status, stock_status, operator_id, create_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderNo, supplierId, totalAmount, paidAmount || 0, payMethod || 'credit', status, 'pending', operatorId, now]
        );

        const orderId = orderResult.lastInsertRowid;

        for (const item of items) {
          execute(
            `INSERT INTO purchase_order_items (
              order_id, product_id, product_name, quantity, unit_price,
              amount, stock_in_qty
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderId, item.productId, item.productName, item.quantity, item.unitPrice, item.amount, 0]
          );
        }

        commitTransaction();

        const newOrder = queryOne<PurchaseOrder>(
          `SELECT po.*, s.name as supplier_name, u.name as operator_name 
           FROM purchase_orders po 
           LEFT JOIN suppliers s ON po.supplier_id = s.id 
           LEFT JOIN users u ON po.operator_id = u.id 
           WHERE po.id = ?`,
          [orderId]
        );

        const orderItems = query<PurchaseOrderItem>(
          'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id ASC',
          [orderId]
        );

        res.json({
          success: true,
          data: { ...newOrder, items: orderItems },
          message: '创建成功'
        } as ApiResponse<PurchaseOrder>);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建采购单失败'
      } as ApiResponse);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { supplierId, items, totalAmount, paidAmount, payMethod, status, operatorId } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      const existing = queryOne<PurchaseOrder>(
        'SELECT * FROM purchase_orders WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '采购单不存在'
        } as ApiResponse);
        return;
      }

      if (existing.stockStatus !== 'pending') {
        res.status(400).json({
          success: false,
          message: '已入库的采购单不能修改'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        let newStatus: 'pending' | 'partial' | 'paid' = status || existing.status;
        if (!status) {
          const newPaidAmount = paidAmount !== undefined ? paidAmount : existing.paidAmount;
          if (newPaidAmount >= totalAmount) {
            newStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newStatus = 'partial';
          }
        }

        execute(
          `UPDATE purchase_orders SET 
            supplier_id = ?, total_amount = ?, paid_amount = ?, pay_method = ?, status = ?
           WHERE id = ?`,
          [
            supplierId || existing.supplierId,
            totalAmount !== undefined ? totalAmount : existing.totalAmount,
            paidAmount !== undefined ? paidAmount : existing.paidAmount,
            payMethod || existing.payMethod,
            newStatus,
            id
          ]
        );

        if (items && items.length > 0) {
          execute('DELETE FROM purchase_order_items WHERE order_id = ?', [id]);

          for (const item of items) {
            execute(
              `INSERT INTO purchase_order_items (
                order_id, product_id, product_name, quantity, unit_price,
                amount, stock_in_qty
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [id, item.productId, item.productName, item.quantity, item.unitPrice, item.amount, 0]
            );
          }
        }

        commitTransaction();

        const updatedOrder = queryOne<PurchaseOrder>(
          `SELECT po.*, s.name as supplier_name, u.name as operator_name 
           FROM purchase_orders po 
           LEFT JOIN suppliers s ON po.supplier_id = s.id 
           LEFT JOIN users u ON po.operator_id = u.id 
           WHERE po.id = ?`,
          [id]
        );

        const orderItems = query<PurchaseOrderItem>(
          'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id ASC',
          [id]
        );

        res.json({
          success: true,
          data: { ...updatedOrder, items: orderItems },
          message: '更新成功'
        } as ApiResponse<PurchaseOrder>);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新采购单失败'
      } as ApiResponse);
    }
  }

  static async stockIn(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { items, operatorId } = req.body;

      if (!id || !items || !items.length || !operatorId) {
        res.status(400).json({
          success: false,
          message: 'ID、入库商品和操作人不能为空'
        } as ApiResponse);
        return;
      }

      const order = queryOne<PurchaseOrder>(
        'SELECT * FROM purchase_orders WHERE id = ?',
        [id]
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: '采购单不存在'
        } as ApiResponse);
        return;
      }

      if (order.stockStatus === 'completed') {
        res.status(400).json({
          success: false,
          message: '采购单已全部入库'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        const now = Date.now();
        let allCompleted = true;

        for (const item of items) {
          const existingItem = queryOne<PurchaseOrderItem>(
            'SELECT * FROM purchase_order_items WHERE id = ? AND order_id = ?',
            [item.id, id]
          );

          if (!existingItem) {
            throw new Error(`商品明细不存在: ${item.id}`);
          }

          const newStockInQty = (existingItem.stockInQty || 0) + (item.stockInQty || 0);

          if (newStockInQty > existingItem.quantity) {
            throw new Error(`入库数量不能超过采购数量: ${existingItem.productName}`);
          }

          execute(
            'UPDATE purchase_order_items SET stock_in_qty = ? WHERE id = ?',
            [newStockInQty, item.id]
          );

          execute(
            'UPDATE products SET stock = stock + ?, update_time = ? WHERE id = ?',
            [item.stockInQty, now, existingItem.productId]
          );

          if (newStockInQty < existingItem.quantity) {
            allCompleted = false;
          }
        }

        const stockStatus: 'pending' | 'partial' | 'completed' = allCompleted ? 'completed' : 'partial';
        execute(
          'UPDATE purchase_orders SET stock_status = ? WHERE id = ?',
          [stockStatus, id]
        );

        commitTransaction();

        const updatedOrder = queryOne<PurchaseOrder>(
          `SELECT po.*, s.name as supplier_name, u.name as operator_name 
           FROM purchase_orders po 
           LEFT JOIN suppliers s ON po.supplier_id = s.id 
           LEFT JOIN users u ON po.operator_id = u.id 
           WHERE po.id = ?`,
          [id]
        );

        const orderItems = query<PurchaseOrderItem>(
          'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id ASC',
          [id]
        );

        res.json({
          success: true,
          data: { ...updatedOrder, items: orderItems },
          message: '入库成功'
        } as ApiResponse<PurchaseOrder>);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '入库失败'
      } as ApiResponse);
    }
  }

  static async updatePayment(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { paidAmount, payMethod, operatorId } = req.body;

      if (!id || !paidAmount || !operatorId) {
        res.status(400).json({
          success: false,
          message: 'ID、付款金额和操作人不能为空'
        } as ApiResponse);
        return;
      }

      const order = queryOne<PurchaseOrder>(
        'SELECT * FROM purchase_orders WHERE id = ?',
        [id]
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: '采购单不存在'
        } as ApiResponse);
        return;
      }

      if (order.status === 'paid') {
        res.status(400).json({
          success: false,
          message: '采购单已结清，无需再付款'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        const newPaidAmount = (order.paidAmount || 0) + paidAmount;
        let status: 'pending' | 'partial' | 'paid' = 'partial';
        if (newPaidAmount >= order.totalAmount) {
          status = 'paid';
        } else if (newPaidAmount <= 0) {
          status = 'pending';
        }

        execute(
          'UPDATE purchase_orders SET paid_amount = ?, pay_method = ?, status = ? WHERE id = ?',
          [newPaidAmount, payMethod || order.payMethod, status, id]
        );

        commitTransaction();

        const updatedOrder = queryOne<PurchaseOrder>(
          `SELECT po.*, s.name as supplier_name, u.name as operator_name 
           FROM purchase_orders po 
           LEFT JOIN suppliers s ON po.supplier_id = s.id 
           LEFT JOIN users u ON po.operator_id = u.id 
           WHERE po.id = ?`,
          [id]
        );

        res.json({
          success: true,
          data: updatedOrder,
          message: '付款成功'
        } as ApiResponse<PurchaseOrder>);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '付款失败'
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

      const existing = queryOne<PurchaseOrder>(
        'SELECT * FROM purchase_orders WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '采购单不存在'
        } as ApiResponse);
        return;
      }

      if (existing.stockStatus !== 'pending') {
        res.status(400).json({
          success: false,
          message: '已入库的采购单不能删除'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        execute('DELETE FROM purchase_order_items WHERE order_id = ?', [id]);
        execute('DELETE FROM purchase_orders WHERE id = ?', [id]);
        commitTransaction();

        res.json({
          success: true,
          message: '删除成功'
        } as ApiResponse);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除采购单失败'
      } as ApiResponse);
    }
  }

  static async getReport(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const supplierId = req.query.supplierId as string;

      let where = '';
      const params: any[] = [];

      if (supplierId) {
        where += 'WHERE po.supplier_id = ?';
        params.push(parseInt(supplierId));
      }

      if (startDate) {
        where += where ? ' AND po.create_time >= ?' : 'WHERE po.create_time >= ?';
        params.push(parseInt(startDate));
      }

      if (endDate) {
        where += where ? ' AND po.create_time <= ?' : 'WHERE po.create_time <= ?';
        params.push(parseInt(endDate));
      }

      const summary = queryOne<{
        totalOrders: number;
        totalAmount: number;
        totalPaid: number;
        totalUnpaid: number;
      }>(
        `SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_amount,
          SUM(paid_amount) as total_paid,
          SUM(total_amount - paid_amount) as total_unpaid
         FROM purchase_orders po 
         ${where}`,
        params
      );

      const bySupplier = query<{
        supplierId: number;
        supplierName: string;
        orderCount: number;
        totalAmount: number;
        totalPaid: number;
        totalUnpaid: number;
      }>(
        `SELECT 
          s.id as supplier_id,
          s.name as supplier_name,
          COUNT(po.id) as order_count,
          SUM(po.total_amount) as total_amount,
          SUM(po.paid_amount) as total_paid,
          SUM(po.total_amount - po.paid_amount) as total_unpaid
         FROM purchase_orders po 
         LEFT JOIN suppliers s ON po.supplier_id = s.id 
         ${where} 
         GROUP BY po.supplier_id 
         ORDER BY total_amount DESC`,
        params
      );

      const byProduct = query<{
        productId: number;
        productName: string;
        totalQuantity: number;
        totalAmount: number;
      }>(
        `SELECT 
          poi.product_id,
          poi.product_name,
          SUM(poi.quantity) as total_quantity,
          SUM(poi.amount) as total_amount
         FROM purchase_order_items poi 
         INNER JOIN purchase_orders po ON poi.order_id = po.id 
         ${where} 
         GROUP BY poi.product_id 
         ORDER BY total_amount DESC 
         LIMIT 20`,
        params
      );

      res.json({
        success: true,
        data: {
          summary,
          bySupplier,
          byProduct
        },
        message: '获取成功'
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取采购报表失败'
      } as ApiResponse);
    }
  }

  static async getPendingStock(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const countResult = queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM purchase_orders WHERE stock_status != 'completed'"
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const orders = query<PurchaseOrder>(
        `SELECT po.*, s.name as supplier_name, u.name as operator_name 
         FROM purchase_orders po 
         LEFT JOIN suppliers s ON po.supplier_id = s.id 
         LEFT JOIN users u ON po.operator_id = u.id 
         WHERE po.stock_status != 'completed' 
         ORDER BY po.create_time DESC 
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      res.json({
        success: true,
        data: { items: orders, total, page, pageSize } as PaginatedResponse<PurchaseOrder>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<PurchaseOrder>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取待入库采购单失败'
      } as ApiResponse);
    }
  }
}
