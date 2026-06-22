import type { Request, Response } from 'express';
import { query, queryOne, execute, beginTransaction, commitTransaction, rollbackTransaction } from '../db/index.js';
import type { ApiResponse, SaleOrder, SaleOrderItem, PaginatedResponse } from '../../shared/types.js';

export class SaleController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const type = req.query.type as string;
      const status = req.query.status as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const projectId = req.query.projectId as string;

      let where = '';
      const params: any[] = [];

      if (type) {
        where += 'WHERE so.type = ?';
        params.push(type);
      }

      if (status) {
        where += where ? ' AND so.status = ?' : 'WHERE so.status = ?';
        params.push(status);
      }

      if (projectId) {
        where += where ? ' AND so.project_id = ?' : 'WHERE so.project_id = ?';
        params.push(parseInt(projectId));
      }

      if (startDate) {
        where += where ? ' AND so.create_time >= ?' : 'WHERE so.create_time >= ?';
        params.push(parseInt(startDate));
      }

      if (endDate) {
        where += where ? ' AND so.create_time <= ?' : 'WHERE so.create_time <= ?';
        params.push(parseInt(endDate));
      }

      const countResult = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM sale_orders so ${where}`,
        params
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const orders = query<SaleOrder>(
        `SELECT so.*, p.name as project_name, u.name as operator_name 
         FROM sale_orders so 
         LEFT JOIN projects p ON so.project_id = p.id 
         LEFT JOIN users u ON so.operator_id = u.id 
         ${where} 
         ORDER BY so.create_time DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: { items: orders, total, page, pageSize } as PaginatedResponse<SaleOrder>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<SaleOrder>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取订单列表失败'
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

      const order = queryOne<SaleOrder>(
        `SELECT so.*, p.name as project_name, u.name as operator_name 
         FROM sale_orders so 
         LEFT JOIN projects p ON so.project_id = p.id 
         LEFT JOIN users u ON so.operator_id = u.id 
         WHERE so.id = ?`,
        [id]
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: '订单不存在'
        } as ApiResponse);
        return;
      }

      const items = query<SaleOrderItem>(
        'SELECT * FROM sale_order_items WHERE order_id = ? ORDER BY id ASC',
        [id]
      );

      res.json({
        success: true,
        data: { ...order, items },
        message: '获取成功'
      } as ApiResponse<SaleOrder>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取订单详情失败'
      } as ApiResponse);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { type, projectId, items, totalAmount, discount, actualAmount, paidAmount, payMethod, operatorId } = req.body;

      if (!type || !items || !items.length || !operatorId) {
        res.status(400).json({
          success: false,
          message: '订单类型、商品列表和操作人不能为空'
        } as ApiResponse);
        return;
      }

      if (type === 'credit' && !projectId) {
        res.status(400).json({
          success: false,
          message: '挂账订单必须选择项目'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        const orderNo = `SO${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const now = Date.now();

        let status: 'pending' | 'paid' | 'partial' = 'paid';
        if (paidAmount <= 0) {
          status = 'pending';
        } else if (paidAmount < actualAmount) {
          status = 'partial';
        }

        const orderResult = execute(
          `INSERT INTO sale_orders (
            order_no, type, project_id, total_amount, discount, actual_amount,
            paid_amount, pay_method, status, operator_id, create_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderNo, type, projectId || null, totalAmount, discount || 0,
            actualAmount, paidAmount || 0, payMethod, status, operatorId, now
          ]
        );

        const orderId = orderResult.lastInsertRowid;

        for (const item of items) {
          execute(
            `INSERT INTO sale_order_items (
              order_id, product_id, product_name, quantity, base_quantity,
              unit_price, amount, unit_type, unit_info
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId, item.productId, item.productName, item.quantity,
              item.baseQuantity, item.unitPrice, item.amount, item.unitType, item.unitInfo
            ]
          );

          execute(
            'UPDATE products SET stock = stock - ?, update_time = ? WHERE id = ?',
            [item.baseQuantity, now, item.productId]
          );
        }

        if (type === 'credit' && projectId) {
          execute(
            'UPDATE projects SET total_debt = total_debt + ?, paid_amount = paid_amount + ? WHERE id = ?',
            [actualAmount, paidAmount || 0, projectId]
          );

          const project = queryOne<{ totalDebt: number; paidAmount: number }>(
            'SELECT total_debt, paid_amount FROM projects WHERE id = ?',
            [projectId]
          );

          if (project) {
            const remainingDebt = project.totalDebt - project.paidAmount;
            let projectStatus = 'active';
            if (remainingDebt <= 0) {
              projectStatus = 'completed';
            }
            execute(
              'UPDATE projects SET status = ? WHERE id = ?',
              [projectStatus, projectId]
            );
          }
        }

        commitTransaction();

        const newOrder = queryOne<SaleOrder>(
          `SELECT so.*, p.name as project_name, u.name as operator_name 
           FROM sale_orders so 
           LEFT JOIN projects p ON so.project_id = p.id 
           LEFT JOIN users u ON so.operator_id = u.id 
           WHERE so.id = ?`,
          [orderId]
        );

        const orderItems = query<SaleOrderItem>(
          'SELECT * FROM sale_order_items WHERE order_id = ? ORDER BY id ASC',
          [orderId]
        );

        res.json({
          success: true,
          data: { ...newOrder, items: orderItems },
          message: '创建成功'
        } as ApiResponse<SaleOrder>);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建订单失败'
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

      const order = queryOne<SaleOrder>(
        'SELECT * FROM sale_orders WHERE id = ?',
        [id]
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: '订单不存在'
        } as ApiResponse);
        return;
      }

      if (order.status === 'paid') {
        res.status(400).json({
          success: false,
          message: '订单已结清，无需再付款'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        const newPaidAmount = (order.paidAmount || 0) + paidAmount;
        let status: 'pending' | 'paid' | 'partial' = 'partial';
        if (newPaidAmount >= order.actualAmount) {
          status = 'paid';
        } else if (newPaidAmount <= 0) {
          status = 'pending';
        }

        execute(
          'UPDATE sale_orders SET paid_amount = ?, pay_method = ?, status = ? WHERE id = ?',
          [newPaidAmount, payMethod || order.payMethod, status, id]
        );

        if (order.projectId) {
          execute(
            'UPDATE projects SET paid_amount = paid_amount + ? WHERE id = ?',
            [paidAmount, order.projectId]
          );

          const project = queryOne<{ totalDebt: number; paidAmount: number }>(
            'SELECT total_debt, paid_amount FROM projects WHERE id = ?',
            [order.projectId]
          );

          if (project) {
            const remainingDebt = project.totalDebt - project.paidAmount;
            let projectStatus = 'active';
            if (remainingDebt <= 0) {
              projectStatus = 'completed';
            }
            execute(
              'UPDATE projects SET status = ? WHERE id = ?',
              [projectStatus, order.projectId]
            );
          }
        }

        commitTransaction();

        const updatedOrder = queryOne<SaleOrder>(
          `SELECT so.*, p.name as project_name, u.name as operator_name 
           FROM sale_orders so 
           LEFT JOIN projects p ON so.project_id = p.id 
           LEFT JOIN users u ON so.operator_id = u.id 
           WHERE so.id = ?`,
          [id]
        );

        res.json({
          success: true,
          data: updatedOrder,
          message: '付款成功'
        } as ApiResponse<SaleOrder>);
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

  static async voidOrder(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      const order = queryOne<SaleOrder>(
        'SELECT * FROM sale_orders WHERE id = ?',
        [id]
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: '订单不存在'
        } as ApiResponse);
        return;
      }

      if (order.status === 'void') {
        res.status(400).json({
          success: false,
          message: '订单已作废'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        execute(
          'UPDATE sale_orders SET status = ? WHERE id = ?',
          ['void', id]
        );

        const items = query<SaleOrderItem>(
          'SELECT * FROM sale_order_items WHERE order_id = ?',
          [id]
        );

        for (const item of items) {
          execute(
            'UPDATE products SET stock = stock + ?, update_time = ? WHERE id = ?',
            [item.baseQuantity, Date.now(), item.productId]
          );
        }

        if (order.projectId && order.paidAmount) {
          execute(
            'UPDATE projects SET total_debt = total_debt - ?, paid_amount = paid_amount - ? WHERE id = ?',
            [order.actualAmount, order.paidAmount, order.projectId]
          );
        }

        commitTransaction();

        res.json({
          success: true,
          message: '订单作废成功'
        } as ApiResponse);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '作废订单失败'
      } as ApiResponse);
    }
  }

  static async createRetail(req: Request, res: Response): Promise<void> {
    req.body = { ...req.body, type: 'retail' };
    await SaleController.create(req, res);
  }

  static async createWholesale(req: Request, res: Response): Promise<void> {
    req.body = { ...req.body, type: 'wholesale' };
    await SaleController.create(req, res);
  }

  static async createCredit(req: Request, res: Response): Promise<void> {
    req.body = { ...req.body, type: 'credit' };
    await SaleController.create(req, res);
  }

  static async getRecent(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const orders = query<SaleOrder>(
        `SELECT so.*, p.name as project_name, u.name as operator_name 
         FROM sale_orders so 
         LEFT JOIN projects p ON so.project_id = p.id 
         LEFT JOIN users u ON so.operator_id = u.id 
         ORDER BY so.create_time DESC 
         LIMIT ?`,
        [limit]
      );

      res.json({
        success: true,
        data: orders,
        message: '获取成功'
      } as ApiResponse<SaleOrder[]>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取最近订单失败'
      } as ApiResponse);
    }
  }
}
