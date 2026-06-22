import { BaseRepository } from './BaseRepository.js';
import { query, queryOne, execute } from '../db/index.js';
import type { PurchaseOrder, PurchaseOrderItem } from '../../shared/types.js';

export class PurchaseRepository extends BaseRepository<PurchaseOrder> {
  constructor() {
    super('purchase_orders');
  }

  findWithItems(id: number): PurchaseOrder | null {
    const order = queryOne<PurchaseOrder>(`
      SELECT po.*, s.name as supplier_name, u.name as operator_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.operator_id = u.id
      WHERE po.id = ?
    `, [id]);

    if (!order) return null;

    const items = query<PurchaseOrderItem>(
      'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id ASC',
      [id]
    );

    return {
      ...order,
      items
    };
  }

  findWithItemsList(where: string = '', params: any[] = [], orderBy: string = 'po.id DESC'): PurchaseOrder[] {
    const orders = query<PurchaseOrder>(`
      SELECT po.*, s.name as supplier_name, u.name as operator_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.operator_id = u.id
      ${where ? 'WHERE ' + where : ''}
      ORDER BY ${orderBy}
    `, params);

    if (orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);
    const allItems = query<PurchaseOrderItem>(
      `SELECT * FROM purchase_order_items WHERE order_id IN (${orderIds.map(() => '?').join(', ')}) ORDER BY id ASC`,
      orderIds
    );

    const itemsMap = new Map<number, PurchaseOrderItem[]>();
    allItems.forEach(item => {
      const list = itemsMap.get(item.orderId!) || [];
      list.push(item);
      itemsMap.set(item.orderId!, list);
    });

    return orders.map(order => ({
      ...order,
      items: itemsMap.get(order.id!) || []
    }));
  }

  findByOrderNo(orderNo: string): PurchaseOrder | null {
    return this.findOne('order_no = ?', [orderNo]);
  }

  findItemsByOrderId(orderId: number): PurchaseOrderItem[] {
    return query<PurchaseOrderItem>(
      'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id ASC',
      [orderId]
    );
  }

  createItem(item: Omit<PurchaseOrderItem, 'id'>): number {
    const result = execute(`
      INSERT INTO purchase_order_items (order_id, product_id, product_name, quantity, unit_price, amount, stock_in_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      item.orderId,
      item.productId,
      item.productName,
      item.quantity,
      item.unitPrice,
      item.amount,
      item.stockInQty || 0
    ]);
    return result.lastInsertRowid;
  }

  updateItemStockInQty(itemId: number, quantity: number): void {
    execute(
      'UPDATE purchase_order_items SET stock_in_qty = stock_in_qty + ? WHERE id = ?',
      [quantity, itemId]
    );
  }

  updatePaidAmount(orderId: number, amount: number): void {
    execute(
      'UPDATE purchase_orders SET paid_amount = paid_amount + ?, update_time = ? WHERE id = ?',
      [amount, Date.now(), orderId]
    );
  }

  updateStatus(orderId: number, status: 'pending' | 'partial' | 'paid'): void {
    execute(
      'UPDATE purchase_orders SET status = ?, update_time = ? WHERE id = ?',
      [status, Date.now(), orderId]
    );
  }

  updateStockStatus(orderId: number, stockStatus?: 'pending' | 'partial' | 'completed'): void {
    if (stockStatus !== undefined) {
      execute(
        'UPDATE purchase_orders SET stock_status = ?, update_time = ? WHERE id = ?',
        [stockStatus, Date.now(), orderId]
      );
      return;
    }

    const items = query<PurchaseOrderItem>(
      'SELECT * FROM purchase_order_items WHERE order_id = ?',
      [orderId]
    );

    if (items.length === 0) return;

    const allCompleted = items.every(item => item.stockInQty >= item.quantity);
    const noneStocked = items.every(item => item.stockInQty === 0);

    let newStockStatus: PurchaseOrder['stockStatus'] = 'pending';
    if (allCompleted) {
      newStockStatus = 'completed';
    } else if (!noneStocked) {
      newStockStatus = 'partial';
    }

    execute(
      'UPDATE purchase_orders SET stock_status = ?, update_time = ? WHERE id = ?',
      [newStockStatus, Date.now(), orderId]
    );
  }

  createWithItems(order: Omit<PurchaseOrder, 'id' | 'orderNo' | 'createTime'>): number {
    return this.transaction(() => {
      const now = Date.now();
      const orderNo = `PO${now}`;

      const orderResult = execute(`
        INSERT INTO purchase_orders (order_no, supplier_id, total_amount, paid_amount, pay_method, status, stock_status, operator_id, create_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNo,
        order.supplierId,
        order.totalAmount,
        order.paidAmount,
        order.payMethod,
        order.status,
        order.stockStatus,
        order.operatorId,
        now
      ]);

      const orderId = orderResult.lastInsertRowid;

      order.items.forEach(item => {
        execute(`
          INSERT INTO purchase_order_items (order_id, product_id, product_name, quantity, unit_price, amount, stock_in_qty)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.amount,
          item.stockInQty || 0
        ]);
      });

      return orderId;
    });
  }

  stockIn(orderId: number, itemId: number, quantity: number): void {
    return this.transaction(() => {
      const now = Date.now();

      execute(
        'UPDATE purchase_order_items SET stock_in_qty = stock_in_qty + ? WHERE id = ? AND order_id = ?',
        [quantity, itemId, orderId]
      );

      const item = queryOne<PurchaseOrderItem>(
        'SELECT * FROM purchase_order_items WHERE id = ?',
        [itemId]
      );

      if (item) {
        execute(
          'UPDATE products SET stock = stock + ?, update_time = ? WHERE id = ?',
          [quantity, now, item.productId]
        );
      }

      this.updateStockStatus(orderId);
    });
  }

  findByDateRange(startTime: number, endTime: number): PurchaseOrder[] {
    return this.findWithItemsList(
      'po.create_time >= ? AND po.create_time <= ?',
      [startTime, endTime]
    );
  }

  findByStatus(status: 'pending' | 'partial' | 'paid'): PurchaseOrder[] {
    return this.findWithItemsList('po.status = ?', [status]);
  }

  findByStockStatus(stockStatus: 'pending' | 'partial' | 'completed'): PurchaseOrder[] {
    return this.findWithItemsList('po.stock_status = ?', [stockStatus]);
  }

  findBySupplierId(supplierId: number): PurchaseOrder[] {
    return this.findWithItemsList('po.supplier_id = ?', [supplierId]);
  }
}
