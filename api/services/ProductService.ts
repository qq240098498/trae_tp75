import { ProductRepository } from '../repositories/ProductRepository.js';
import { UnitConvertService } from '../../shared/UnitConvertService.js';
import { Product } from '../../shared/types.js';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  getAll(where: string = '', params: any[] = [], orderBy: string = 'id DESC'): Product[] {
    const products = this.productRepository.findWithCategoryName(where, params, orderBy);
    return products.map(p => this.calculateMinUnitPrice(p));
  }

  getById(id: number): Product | null {
    const product = this.productRepository.findById(id);
    return product ? this.calculateMinUnitPrice(product) : null;
  }

  getBySku(sku: string): Product | null {
    const product = this.productRepository.findBySku(sku);
    return product ? this.calculateMinUnitPrice(product) : null;
  }

  getByBarcode(barcode: string): Product | null {
    const product = this.productRepository.findByBarcode(barcode);
    return product ? this.calculateMinUnitPrice(product) : null;
  }

  search(keyword: string): Product[] {
    const products = this.productRepository.search(keyword);
    return products.map(p => this.calculateMinUnitPrice(p));
  }

  getLowStock(): Product[] {
    const products = this.productRepository.findLowStock();
    return products.map(p => this.calculateMinUnitPrice(p));
  }

  paginate(page: number = 1, pageSize: number = 20, where: string = '', params: any[] = [], orderBy: string = 'id DESC'): { items: Product[]; total: number; page: number; pageSize: number } {
    const result = this.productRepository.paginate(page, pageSize, where, params, orderBy);
    return {
      ...result,
      items: result.items.map(p => this.calculateMinUnitPrice(p))
    };
  }

  create(data: Omit<Product, 'id' | 'minUnitPrice' | 'createTime' | 'updateTime'>): number {
    const now = Date.now();
    const product: Product = {
      ...data,
      id: 0,
      minUnitPrice: 0,
      createTime: now,
      updateTime: now
    };
    product.minUnitPrice = UnitConvertService.calculateMinUnitPrice(product);

    return this.productRepository.transaction(() => {
      return this.productRepository.create(product);
    });
  }

  update(id: number, data: Partial<Omit<Product, 'id' | 'createTime'>>): boolean {
    const existing = this.productRepository.findById(id);
    if (!existing) {
      throw new Error('商品不存在');
    }

    const updateData: Partial<Product> = {
      ...data,
      updateTime: Date.now()
    };

    if (data.retailPrice !== undefined || data.unitRate !== undefined) {
      const productForCalc = { ...existing, ...data };
      updateData.minUnitPrice = UnitConvertService.calculateMinUnitPrice(productForCalc);
    }

    return this.productRepository.transaction(() => {
      return this.productRepository.update(id, updateData);
    });
  }

  delete(id: number): boolean {
    return this.productRepository.transaction(() => {
      return this.productRepository.delete(id);
    });
  }

  updateStock(id: number, quantity: number): boolean {
    return this.productRepository.transaction(() => {
      return this.productRepository.updateStock(id, quantity);
    });
  }

  private calculateMinUnitPrice(product: Product): Product {
    return {
      ...product,
      minUnitPrice: UnitConvertService.calculateMinUnitPrice(product)
    };
  }
}
