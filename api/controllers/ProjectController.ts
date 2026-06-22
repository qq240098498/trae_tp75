import type { Request, Response } from 'express';
import { query, queryOne, execute, beginTransaction, commitTransaction, rollbackTransaction } from '../db/index.js';
import type { ApiResponse, Project, ProjectPayment, PaginatedResponse, SaleOrder } from '../../shared/types.js';

export class ProjectController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = req.query.status as string;
      const keyword = req.query.keyword as string;

      let where = '';
      const params: any[] = [];

      if (status) {
        where += 'WHERE status = ?';
        params.push(status);
      }

      if (keyword) {
        where += where ? ' AND (name LIKE ? OR contact LIKE ? OR phone LIKE ?)' : 'WHERE (name LIKE ? OR contact LIKE ? OR phone LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      const countResult = queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM projects ${where}`,
        params
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const items = query<Project>(
        `SELECT * FROM projects ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      ).map(project => ({
        ...project,
        remainingDebt: project.totalDebt - project.paidAmount,
        daysRemaining: Math.ceil((project.dueDate - Date.now()) / (1000 * 60 * 60 * 24))
      }));

      res.json({
        success: true,
        data: { items, total, page, pageSize } as PaginatedResponse<Project>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<Project>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取项目列表失败'
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

      const project = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (!project) {
        res.status(404).json({
          success: false,
          message: '项目不存在'
        } as ApiResponse);
        return;
      }

      const payments = query<ProjectPayment>(
        `SELECT pp.*, u.name as operator_name 
         FROM project_payments pp 
         LEFT JOIN users u ON pp.operator_id = u.id 
         WHERE pp.project_id = ? 
         ORDER BY pp.create_time DESC`,
        [id]
      );

      const orders = query<SaleOrder>(
        `SELECT so.*, u.name as operator_name 
         FROM sale_orders so 
         LEFT JOIN users u ON so.operator_id = u.id 
         WHERE so.project_id = ? 
         ORDER BY so.create_time DESC`,
        [id]
      );

      const projectDetail: Project & { payments?: ProjectPayment[]; orders?: SaleOrder[] } = {
        ...project,
        remainingDebt: project.totalDebt - project.paidAmount,
        daysRemaining: Math.ceil((project.dueDate - Date.now()) / (1000 * 60 * 60 * 24)),
        payments,
        orders
      };

      res.json({
        success: true,
        data: projectDetail,
        message: '获取成功'
      } as ApiResponse<Project>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取项目详情失败'
      } as ApiResponse);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, address, contact, phone, dueDate, remark } = req.body;

      if (!name || !contact || !phone || !dueDate) {
        res.status(400).json({
          success: false,
          message: '项目名称、联系人、电话和截止日期不能为空'
        } as ApiResponse);
        return;
      }

      const now = Date.now();

      const result = execute(
        `INSERT INTO projects (
          name, address, contact, phone, due_date, total_debt, paid_amount,
          status, remark, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, address || '', contact, phone, dueDate, 0, 0, 'active', remark || '', now]
      );

      const newProject = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [result.lastInsertRowid]
      );

      if (newProject) {
        newProject.remainingDebt = newProject.totalDebt - newProject.paidAmount;
        newProject.daysRemaining = Math.ceil((newProject.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
      }

      res.json({
        success: true,
        data: newProject,
        message: '创建成功'
      } as ApiResponse<Project>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建项目失败'
      } as ApiResponse);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { name, address, contact, phone, dueDate, status, remark } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID不能为空'
        } as ApiResponse);
        return;
      }

      if (!name || !contact || !phone || !dueDate) {
        res.status(400).json({
          success: false,
          message: '项目名称、联系人、电话和截止日期不能为空'
        } as ApiResponse);
        return;
      }

      const existing = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '项目不存在'
        } as ApiResponse);
        return;
      }

      execute(
        `UPDATE projects SET 
          name = ?, address = ?, contact = ?, phone = ?, due_date = ?, 
          status = ?, remark = ? 
         WHERE id = ?`,
        [
          name, address || existing.address, contact, phone, dueDate,
          status || existing.status, remark !== undefined ? remark : existing.remark, id
        ]
      );

      const updated = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (updated) {
        updated.remainingDebt = updated.totalDebt - updated.paidAmount;
        updated.daysRemaining = Math.ceil((updated.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
      }

      res.json({
        success: true,
        data: updated,
        message: '更新成功'
      } as ApiResponse<Project>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新项目失败'
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

      const existing = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '项目不存在'
        } as ApiResponse);
        return;
      }

      const orderCount = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM sale_orders WHERE project_id = ?',
        [id]
      );

      if (orderCount && orderCount.count > 0) {
        res.status(400).json({
          success: false,
          message: '该项目下有订单，无法删除'
        } as ApiResponse);
        return;
      }

      execute('DELETE FROM project_payments WHERE project_id = ?', [id]);
      execute('DELETE FROM projects WHERE id = ?', [id]);

      res.json({
        success: true,
        message: '删除成功'
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除项目失败'
      } as ApiResponse);
    }
  }

  static async addPayment(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { amount, payMethod, remark, operatorId } = req.body;

      if (!id || !amount || !payMethod || !operatorId) {
        res.status(400).json({
          success: false,
          message: 'ID、回款金额、付款方式和操作人不能为空'
        } as ApiResponse);
        return;
      }

      const project = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (!project) {
        res.status(404).json({
          success: false,
          message: '项目不存在'
        } as ApiResponse);
        return;
      }

      beginTransaction();

      try {
        const now = Date.now();

        execute(
          `INSERT INTO project_payments (
            project_id, amount, pay_method, remark, operator_id, create_time
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, amount, payMethod, remark || '', operatorId, now]
        );

        const newPaidAmount = project.paidAmount + amount;
        let status: 'active' | 'completed' | 'overdue' = project.status;
        if (newPaidAmount >= project.totalDebt && project.totalDebt > 0) {
          status = 'completed';
        }

        execute(
          'UPDATE projects SET paid_amount = ?, status = ? WHERE id = ?',
          [newPaidAmount, status, id]
        );

        commitTransaction();

        const updatedProject = queryOne<Project>(
          'SELECT * FROM projects WHERE id = ?',
          [id]
        );

        if (updatedProject) {
          updatedProject.remainingDebt = updatedProject.totalDebt - updatedProject.paidAmount;
          updatedProject.daysRemaining = Math.ceil((updatedProject.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
        }

        res.json({
          success: true,
          data: updatedProject,
          message: '回款成功'
        } as ApiResponse<Project>);
      } catch (txError) {
        rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '回款失败'
      } as ApiResponse);
    }
  }

  static async getDueSoon(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const days = parseInt(req.query.days as string) || 7;
      const dueDateThreshold = Date.now() + days * 24 * 60 * 60 * 1000;

      const items = query<Project>(
        `SELECT * FROM projects 
         WHERE status = 'active' AND due_date <= ? 
         ORDER BY due_date ASC 
         LIMIT ?`,
        [dueDateThreshold, limit]
      ).map(project => ({
        ...project,
        remainingDebt: project.totalDebt - project.paidAmount,
        daysRemaining: Math.ceil((project.dueDate - Date.now()) / (1000 * 60 * 60 * 24))
      }));

      res.json({
        success: true,
        data: items,
        message: '获取成功'
      } as ApiResponse<Project[]>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取即将到期项目失败'
      } as ApiResponse);
    }
  }

  static async getOverdue(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const countResult = queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM projects WHERE status = 'overdue'"
      );
      const total = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const items = query<Project>(
        `SELECT * FROM projects 
         WHERE status = 'overdue' 
         ORDER BY due_date ASC 
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      ).map(project => ({
        ...project,
        remainingDebt: project.totalDebt - project.paidAmount,
        daysRemaining: Math.ceil((project.dueDate - Date.now()) / (1000 * 60 * 60 * 24))
      }));

      res.json({
        success: true,
        data: { items, total, page, pageSize } as PaginatedResponse<Project>,
        message: '获取成功'
      } as ApiResponse<PaginatedResponse<Project>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取逾期项目失败'
      } as ApiResponse);
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!id || !status) {
        res.status(400).json({
          success: false,
          message: 'ID和状态不能为空'
        } as ApiResponse);
        return;
      }

      const existing = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (!existing) {
        res.status(404).json({
          success: false,
          message: '项目不存在'
        } as ApiResponse);
        return;
      }

      execute(
        'UPDATE projects SET status = ? WHERE id = ?',
        [status, id]
      );

      const updated = queryOne<Project>(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (updated) {
        updated.remainingDebt = updated.totalDebt - updated.paidAmount;
        updated.daysRemaining = Math.ceil((updated.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
      }

      res.json({
        success: true,
        data: updated,
        message: '状态更新成功'
      } as ApiResponse<Project>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新状态失败'
      } as ApiResponse);
    }
  }
}
