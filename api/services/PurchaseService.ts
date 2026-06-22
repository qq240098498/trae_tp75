import { PurchaseRepository } from '../repositories/PurchaseRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { PurchaseOrder, PurchaseOrderItem } from '../../shared/types.js';

export class PurchaseService {
  private purchaseRepository: PurchaseRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.purchaseRepository = new PurchaseRepository();
    this.productRepository = new ProductRepository();
  }

  getAll(where: string = '', params: any[] = [], orderBy: string = 'id DESC'): PurchaseOrder[] {
    return this.purchaseRepository.findWithItemsList(where, params, orderBy);
  }

  getById(id: number): PurchaseOrder | null {
    return this.purchaseRepository.findWithItems(id);
  }

  getByDateRange(startTime: number, endTime: number): PurchaseOrder[] {
    return this.purchaseRepository.findByDateRange(startTime, endTime);
  }

  getByStatus(status: 'pending' | 'partial' | 'paid'): PurchaseOrder[] {
    return this.purchaseRepository.findByStatus(status);
  }

  getByStockStatus(stockStatus: 'pending' | 'partial' | 'completed'): PurchaseOrder[] {
    return this.purchaseRepository.findByStockStatus(stockStatus);
  }

  getBySupplierId(supplierId: number): PurchaseOrder[] {
    return this.purchaseRepository.findBySupplierId(supplierId);
  }

  paginate(page: number = 1, pageSize: number = 20, where: string = '', params: any[] = [], orderBy: string = 'id DESC'): { items: PurchaseOrder[]; total: number; page: number; pageSize: number } {
    return this.purchaseRepository.paginate(page, pageSize, where, params, orderBy);
  }

  create(
    supplierId: number,
    items: Array<{ productId: number; productName: string; quantity: number; unitPrice: number }>,
    payMethod: 'cash' | 'transfer' | 'credit',
    paidAmount: number,
    operatorId: number
  ): number {
    return this.purchaseRepository.transaction(() => {
      for (const item of items) {
        const product = this.productRepository.findById(item.productId);
        if (!product) {
          throw new Error(`商品不存在: ${item.productName}`);
        }
      }

      const orderItems = items.map(item => ({
        ...item,
        amount: item.quantity * item.unitPrice,
        stockInQty: 0
      }));

      const totalAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);

      let status: 'pending' | 'partial' | 'paid' = 'pending';
      if (paidAmount >= totalAmount) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }

      const order: Omit<PurchaseOrder, 'id' | 'orderNo' | 'createTime'> = {
        supplierId,
        items: orderItems,
        totalAmount,
        paidAmount,
        payMethod,
        status,
        stockStatus: 'pending',
        operatorId
      };

      return this.purchaseRepository.createWithItems(order);
    });
  }

  update(id: number, data: Partial<Omit<PurchaseOrder, 'id' | 'createTime' | 'items'>>): boolean {
    return this.purchaseRepository.transaction(() => {
      return this.purchaseRepository.update(id, data);
    });
  }

  delete(id: number): boolean {
    return this.purchaseRepository.transaction(() => {
      const order = this.purchaseRepository.findWithItems(id);
      if (!order) {
        throw new Error('采购订单不存在');
      }

      for (const item of order.items) {
        if (item.stockInQty > 0) {
          this.productRepository.updateStock(item.productId, -item.stockInQty);
        }
      }

      return this.purchaseRepository.delete(id);
    });
  }

  stockIn(orderId: number, itemStockInList: Array<{ itemId: number; quantity: number }>): boolean {
    return this.purchaseRepository.transaction(() => {
      const order = this.purchaseRepository.findById(orderId);
      if (!order) {
        throw new Error('采购订单不存在');
      }

      for (const stockIn of itemStockInList) {
        this.purchaseRepository.stockIn(orderId, stockIn.itemId, stockIn.quantity);
      }

      return true;
    });
  }

  addPayment(orderId: number, amount: number): boolean {
    return this.purchaseRepository.transaction(() => {
      const order = this.purchaseRepository.findById(orderId);
      if (!order) {
        throw new Error('采购订单不存在');
      }

      const newPaidAmount = order.paidAmount + amount;
      let status: 'pending' | 'partial' | 'paid' = 'pending';
      if (newPaidAmount >= order.totalAmount) {
        status = 'paid';
      } else if (newPaidAmount > 0) {
        status = 'partial';
      }

      return this.purchaseRepository.update(orderId, {
        paidAmount: newPaidAmount,
        status
      });
    });
  }
}
