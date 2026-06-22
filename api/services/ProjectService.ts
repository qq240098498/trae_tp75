import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { Project, ProjectPayment } from '../../shared/types.js';

export class ProjectService {
  private projectRepository: ProjectRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
  }

  getAll(where: string = '', params: any[] = [], orderBy: string = 'id DESC'): Project[] {
    return this.projectRepository.findWithDetailList(where, params, orderBy);
  }

  getById(id: number): (Project & { payments: ProjectPayment[] }) | null {
    return this.projectRepository.findWithDetail(id);
  }

  paginate(page: number = 1, pageSize: number = 20, where: string = '', params: any[] = [], orderBy: string = 'id DESC'): { items: Project[]; total: number; page: number; pageSize: number } {
    const result = this.projectRepository.paginate(page, pageSize, where, params, orderBy);
    return {
      ...result,
      items: result.items.map(p => this.calculateProjectExtra(p))
    };
  }

  getOverdue(): Project[] {
    return this.projectRepository.findOverdue();
  }

  getDueSoon(days: number = 7): Project[] {
    return this.projectRepository.findDueSoon(days);
  }

  getTotalReceivable(): number {
    return this.projectRepository.getTotalReceivable();
  }

  getPayments(projectId: number): ProjectPayment[] {
    return this.projectRepository.findPaymentsByProjectId(projectId);
  }

  create(data: Omit<Project, 'id' | 'totalDebt' | 'paidAmount' | 'remainingDebt' | 'daysRemaining' | 'createTime'>): number {
    return this.projectRepository.transaction(() => {
      const now = Date.now();
      const project: Omit<Project, 'id'> = {
        ...data,
        totalDebt: 0,
        paidAmount: 0,
        status: 'active',
        createTime: now
      };

      const id = this.projectRepository.create(project);
      this.projectRepository.updateStatus(id);
      return id;
    });
  }

  update(id: number, data: Partial<Omit<Project, 'id' | 'createTime' | 'totalDebt' | 'paidAmount'>>): boolean {
    return this.projectRepository.transaction(() => {
      const result = this.projectRepository.update(id, data);
      if (result) {
        this.projectRepository.updateStatus(id);
      }
      return result;
    });
  }

  delete(id: number): boolean {
    return this.projectRepository.transaction(() => {
      return this.projectRepository.delete(id);
    });
  }

  addPayment(
    projectId: number,
    amount: number,
    payMethod: string,
    remark: string,
    operatorId: number
  ): number {
    return this.projectRepository.transaction(() => {
      const project = this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }

      const paymentId = this.projectRepository.addPayment(projectId, {
        amount,
        payMethod,
        remark,
        operatorId
      });

      this.projectRepository.updateStatus(projectId);

      return paymentId;
    });
  }

  private calculateProjectExtra(project: Project): Project {
    const remainingDebt = project.totalDebt - project.paidAmount;
    const daysRemaining = Math.ceil((project.dueDate - Date.now()) / (24 * 60 * 60 * 1000));

    return {
      ...project,
      remainingDebt,
      daysRemaining
    };
  }
}
