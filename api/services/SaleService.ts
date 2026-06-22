import { SaleRepository } from '../repositories/SaleRepository.js';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { UnitConvertService } from '../../shared/UnitConvertService.js';
import { SaleOrder, SaleOrderItem, CartItem, Product } from '../../shared/types.js';

export class SaleService {
  private saleRepository: SaleRepository;
  private productRepository: ProductRepository;
  private projectRepository: ProjectRepository;

  constructor() {
    this.saleRepository = new SaleRepository();
    this.productRepository = new ProductRepository();
    this.projectRepository = new ProjectRepository();
  }

  getAll(where: string = '', params: any[] = [], orderBy: string = 'id DESC'): SaleOrder[] {
    return this.saleRepository.findWithItemsList(where, params, orderBy);
  }

  getById(id: number): SaleOrder | null {
    return this.saleRepository.findWithItems(id);
  }

  getByOrderNo(orderNo: string): SaleOrder | null {
    return this.saleRepository.findByOrderNo(orderNo);
  }

  getByDateRange(startTime: number, endTime: number): SaleOrder[] {
    return this.saleRepository.findByDateRange(startTime, endTime);
  }

  getByType(type: 'retail' | 'wholesale' | 'credit'): SaleOrder[] {
    return this.saleRepository.findByType(type);
  }

  getByStatus(status: 'pending' | 'paid' | 'partial' | 'void'): SaleOrder[] {
    return this.saleRepository.findByStatus(status);
  }

  getByProjectId(projectId: number): SaleOrder[] {
    return this.saleRepository.findByProjectId(projectId);
  }

  paginate(page: number = 1, pageSize: number = 20, where: string = '', params: any[] = [], orderBy: string = 'id DESC'): { items: SaleOrder[]; total: number; page: number; pageSize: number } {
    return this.saleRepository.paginate(page, pageSize, where, params, orderBy);
  }

  createCartItem(product: Product, quantity: number, isWholesale: boolean = false): CartItem {
    return UnitConvertService.createCartItem(product, quantity, isWholesale);
  }

  createOrder(
    type: 'retail' | 'wholesale' | 'credit',
    cartItems: CartItem[],
    discount: number,
    payMethod: 'cash' | 'wechat' | 'alipay' | 'card' | 'credit',
    paidAmount: number,
    operatorId: number,
    projectId?: number
  ): number {
    return this.saleRepository.transaction(() => {
      const orderItems = cartItems.map(cartItem => UnitConvertService.createSaleOrderItem(cartItem));
      const totalAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);
      const actualAmount = totalAmount - discount;

      if (type === 'credit' && !projectId) {
        throw new Error('挂账订单必须指定项目');
      }

      for (const cartItem of cartItems) {
        const product = this.productRepository.findById(cartItem.product.id);
        if (!product) {
          throw new Error(`商品不存在: ${cartItem.product.name}`);
        }
        if (product.stock < cartItem.baseQuantity) {
          throw new Error(`库存不足: ${product.name}, 当前库存: ${product.stock}, 需要: ${cartItem.baseQuantity}`);
        }
      }

      let status: 'pending' | 'paid' | 'partial' | 'void' = 'pending';
      if (paidAmount >= actualAmount) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }

      const order: Omit<SaleOrder, 'id' | 'orderNo' | 'createTime'> = {
        type,
        projectId,
        items: orderItems,
        totalAmount,
        discount,
        actualAmount,
        paidAmount,
        payMethod,
        status,
        operatorId
      };

      const orderId = this.saleRepository.createWithItems(order);

      if (type === 'credit' && projectId) {
        this.projectRepository.updateTotalDebt(projectId, actualAmount);
        if (paidAmount > 0) {
          this.projectRepository.updatePaidAmount(projectId, paidAmount);
        }
        this.projectRepository.updateStatus(projectId);
      }

      return orderId;
    });
  }

  retailSale(
    cartItems: CartItem[],
    discount: number,
    payMethod: 'cash' | 'wechat' | 'alipay' | 'card',
    paidAmount: number,
    operatorId: number
  ): number {
    return this.createOrder('retail', cartItems, discount, payMethod, paidAmount, operatorId);
  }

  wholesaleSale(
    cartItems: CartItem[],
    discount: number,
    payMethod: 'cash' | 'wechat' | 'alipay' | 'card',
    paidAmount: number,
    operatorId: number
  ): number {
    return this.createOrder('wholesale', cartItems, discount, payMethod, paidAmount, operatorId);
  }

  creditSale(
    projectId: number,
    cartItems: CartItem[],
    discount: number,
    paidAmount: number,
    operatorId: number
  ): number {
    return this.createOrder('credit', cartItems, discount, 'credit', paidAmount, operatorId, projectId);
  }

  voidOrder(id: number): boolean {
    return this.saleRepository.transaction(() => {
      const order = this.saleRepository.findWithItems(id);
      if (!order) {
        throw new Error('订单不存在');
      }
      if (order.status === 'void') {
        throw new Error('订单已作废');
      }

      for (const item of order.items) {
        this.productRepository.updateStock(item.productId, item.baseQuantity);
      }

      if (order.type === 'credit' && order.projectId) {
        this.projectRepository.updateTotalDebt(order.projectId, -order.actualAmount);
        if (order.paidAmount > 0) {
          this.projectRepository.updatePaidAmount(order.projectId, -order.paidAmount);
        }
        this.projectRepository.updateStatus(order.projectId);
      }

      return this.saleRepository.update(id, { status: 'void' });
    });
  }

  getTodaySalesCount(): number {
    return this.saleRepository.getTodaySalesCount();
  }

  getTodaySalesAmount(): number {
    return this.saleRepository.getTodaySalesAmount();
  }

  getMonthSalesAmount(): number {
    return this.saleRepository.getMonthSalesAmount();
  }
}
