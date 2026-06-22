import { BaseRepository } from './BaseRepository.js';
import { query, queryOne, execute } from '../db/index.js';
import type { Project, ProjectPayment } from '../../shared/types.js';

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super('projects');
  }

  findWithDetail(id: number): (Project & { payments: ProjectPayment[] }) | null {
    const project = this.findById(id);
    if (!project) return null;

    const payments = query<ProjectPayment>(
      'SELECT * FROM project_payments WHERE project_id = ? ORDER BY create_time DESC',
      [id]
    );

    const remainingDebt = project.totalDebt - project.paidAmount;
    const daysRemaining = Math.ceil((project.dueDate - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      ...project,
      remainingDebt,
      daysRemaining,
      payments
    };
  }

  findWithDetailList(where: string = '', params: any[] = [], orderBy: string = 'id DESC'): Project[] {
    const projects = this.findAll(where, params, orderBy);
    return projects.map(project => {
      const remainingDebt = project.totalDebt - project.paidAmount;
      const daysRemaining = Math.ceil((project.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        ...project,
        remainingDebt,
        daysRemaining
      };
    });
  }

  findOverdue(): Project[] {
    const now = Date.now();
    return this.findWithDetailList(
      'status = ? AND due_date < ?',
      ['active', now],
      'due_date ASC'
    );
  }

  findDueSoon(days: number = 7): Project[] {
    const now = Date.now();
    const dueDateThreshold = now + days * 24 * 60 * 60 * 1000;
    return this.findWithDetailList(
      'status = ? AND due_date >= ? AND due_date <= ?',
      ['active', now, dueDateThreshold],
      'due_date ASC'
    );
  }

  getTotalReceivable(): number {
    const result = queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(total_debt - paid_amount), 0) as total FROM projects WHERE status != ?',
      ['completed']
    );
    return result?.total || 0;
  }

  findPaymentsByProjectId(projectId: number): ProjectPayment[] {
    return query<ProjectPayment>(
      'SELECT * FROM project_payments WHERE project_id = ? ORDER BY create_time DESC',
      [projectId]
    );
  }

  createPayment(payment: Omit<ProjectPayment, 'id'>): number {
    const result = execute(
      'INSERT INTO project_payments (project_id, amount, pay_method, remark, operator_id, create_time) VALUES (?, ?, ?, ?, ?, ?)',
      [payment.projectId, payment.amount, payment.payMethod, payment.remark, payment.operatorId, payment.createTime]
    );
    return result.lastInsertRowid;
  }

  updatePaidAmount(projectId: number, amount: number): void {
    execute(
      'UPDATE projects SET paid_amount = paid_amount + ?, update_time = ? WHERE id = ?',
      [amount, Date.now(), projectId]
    );
  }

  updateTotalDebt(projectId: number, amount: number): void {
    execute(
      'UPDATE projects SET total_debt = total_debt + ?, update_time = ? WHERE id = ?',
      [amount, Date.now(), projectId]
    );
  }

  addPayment(projectId: number, payment: Omit<ProjectPayment, 'id' | 'projectId' | 'createTime'>): number {
    return this.transaction(() => {
      const result = execute(
        'INSERT INTO project_payments (project_id, amount, pay_method, remark, operator_id, create_time) VALUES (?, ?, ?, ?, ?, ?)',
        [projectId, payment.amount, payment.payMethod, payment.remark, payment.operatorId, Date.now()]
      );

      execute(
        'UPDATE projects SET paid_amount = paid_amount + ?, update_time = ? WHERE id = ?',
        [payment.amount, Date.now(), projectId]
      );

      return result.lastInsertRowid;
    });
  }

  updateStatus(id: number): void {
    const project = this.findById(id);
    if (!project) return;

    const remainingDebt = project.totalDebt - project.paidAmount;
    const now = Date.now();

    let status: Project['status'] = 'active';
    if (remainingDebt <= 0) {
      status = 'completed';
    } else if (project.dueDate < now) {
      status = 'overdue';
    }

    execute('UPDATE projects SET status = ?, update_time = ? WHERE id = ?', [status, now, id]);
  }
}
