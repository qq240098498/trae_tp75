import { SupplierRepository } from '../repositories/SupplierRepository.js';
import { Supplier } from '../../shared/types.js';

export class SupplierService {
  private supplierRepository: SupplierRepository;

  constructor() {
    this.supplierRepository = new SupplierRepository();
  }

  getAll(where: string = '', params: any[] = [], orderBy: string = 'id DESC'): Supplier[] {
    return this.supplierRepository.findAll(where, params, orderBy);
  }

  getById(id: number): Supplier | null {
    return this.supplierRepository.findById(id);
  }

  search(keyword: string): Supplier[] {
    return this.supplierRepository.search(keyword);
  }

  getByCreditRating(rating: 'A' | 'B' | 'C'): Supplier[] {
    return this.supplierRepository.findByCreditRating(rating);
  }

  getByMainCategory(mainCategory: string): Supplier[] {
    return this.supplierRepository.findByMainCategory(mainCategory);
  }

  paginate(page: number = 1, pageSize: number = 20, where: string = '', params: any[] = [], orderBy: string = 'id DESC'): { items: Supplier[]; total: number; page: number; pageSize: number } {
    return this.supplierRepository.paginate(page, pageSize, where, params, orderBy);
  }

  create(data: Omit<Supplier, 'id' | 'createTime'>): number {
    const now = Date.now();
    const supplier: Omit<Supplier, 'id'> = {
      ...data,
      createTime: now
    };

    return this.supplierRepository.transaction(() => {
      return this.supplierRepository.create(supplier);
    });
  }

  update(id: number, data: Partial<Omit<Supplier, 'id' | 'createTime'>>): boolean {
    return this.supplierRepository.transaction(() => {
      return this.supplierRepository.update(id, data);
    });
  }

  delete(id: number): boolean {
    return this.supplierRepository.transaction(() => {
      return this.supplierRepository.delete(id);
    });
  }
}
