import { BaseRepository } from './BaseRepository.js';
import { query, queryOne, execute } from '../db/index.js';
import type { SaleOrder, SaleOrderItem } from '../../shared/types.js';

export class SaleRepository extends BaseRepository<SaleOrder> {
  constructor() {
    super('sale_orders');
  }

  findWithItems(id: number): SaleOrder | null {
    const order = queryOne<SaleOrder>(`
      SELECT so.*, p.name as project_name, u.name as operator_name
      FROM sale_orders so
      LEFT JOIN projects p ON so.project_id = p.id
      LEFT JOIN users u ON so.operator_id = u.id
      WHERE so.id = ?
    `, [id]);

    if (!order) return null;

    const items = query<SaleOrderItem>(
      'SELECT * FROM sale_order_items WHERE order_id = ? ORDER BY id ASC',
      [id]
    );

    return {
      ...order,
      items
    };
  }

  findWithItemsList(where: string = '', params: any[] = [], orderBy: string = 'so.id DESC'): SaleOrder[] {
    const orders = query<SaleOrder>(`
      SELECT so.*, p.name as project_name, u.name as operator_name
      FROM sale_orders so
      LEFT JOIN projects p ON so.project_id = p.id
      LEFT JOIN users u ON so.operator_id = u.id
      ${where ? 'WHERE ' + where : ''}
      ORDER BY ${orderBy}
    `, params);

    if (orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);
    const allItems = query<SaleOrderItem>(
      `SELECT * FROM sale_order_items WHERE order_id IN (${orderIds.map(() => '?').join(', ')}) ORDER BY id ASC`,
      orderIds
    );

    const itemsMap = new Map<number, SaleOrderItem[]>();
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

  findByOrderNo(orderNo: string): SaleOrder | null {
    return this.findOne('order_no = ?', [orderNo]);
  }

  findItemsByOrderId(orderId: number): SaleOrderItem[] {
    return query<SaleOrderItem>(
      'SELECT * FROM sale_order_items WHERE order_id = ? ORDER BY id ASC',
      [orderId]
    );
  }

  createItem(item: Omit<SaleOrderItem, 'id'>): number {
    const result = execute(`
      INSERT INTO sale_order_items (order_id, product_id, product_name, quantity, base_quantity, unit_price, amount, unit_type, unit_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.orderId,
      item.productId,
      item.productName,
      item.quantity,
      item.baseQuantity,
      item.unitPrice,
      item.amount,
      item.unitType,
      item.unitInfo
    ]);
    return result.lastInsertRowid;
  }

  getTodaySalesCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = today.getTime();
    const endTime = startTime + 24 * 60 * 60 * 1000;

    const result = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM sale_orders WHERE create_time >= ? AND create_time < ? AND status != ?',
      [startTime, endTime, 'void']
    );
    return result?.count || 0;
  }

  getTodaySalesAmount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = today.getTime();
    const endTime = startTime + 24 * 60 * 60 * 1000;

    const result = queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(actual_amount), 0) as total FROM sale_orders WHERE create_time >= ? AND create_time < ? AND status != ?',
      [startTime, endTime, 'void']
    );
    return result?.total || 0;
  }

  getMonthSalesAmount(): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startTime = startOfMonth.getTime();
    const endTime = Date.now();

    const result = queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(actual_amount), 0) as total FROM sale_orders WHERE create_time >= ? AND create_time <= ? AND status != ?',
      [startTime, endTime, 'void']
    );
    return result?.total || 0;
  }

  createWithItems(order: Omit<SaleOrder, 'id' | 'orderNo' | 'createTime'>): number {
    return this.transaction(() => {
      const now = Date.now();
      const orderNo = `SO${now}`;

      const orderResult = execute(`
        INSERT INTO sale_orders (order_no, type, project_id, total_amount, discount, actual_amount, paid_amount, pay_method, status, operator_id, create_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNo,
        order.type,
        order.projectId || null,
        order.totalAmount,
        order.discount,
        order.actualAmount,
        order.paidAmount,
        order.payMethod,
        order.status,
        order.operatorId,
        now
      ]);

      const orderId = orderResult.lastInsertRowid;

      order.items.forEach(item => {
        execute(`
          INSERT INTO sale_order_items (order_id, product_id, product_name, quantity, base_quantity, unit_price, amount, unit_type, unit_info)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          item.productId,
          item.productName,
          item.quantity,
          item.baseQuantity,
          item.unitPrice,
          item.amount,
          item.unitType,
          item.unitInfo
        ]);

        execute(
          'UPDATE products SET stock = stock - ?, update_time = ? WHERE id = ?',
          [item.baseQuantity, now, item.productId]
        );
      });

      if (order.projectId && order.paidAmount > 0) {
        execute(
          'UPDATE projects SET paid_amount = paid_amount + ?, update_time = ? WHERE id = ?',
          [order.paidAmount, now, order.projectId]
        );
      }

      return orderId;
    });
  }

  findByDateRange(startTime: number, endTime: number): SaleOrder[] {
    return this.findWithItemsList(
      'so.create_time >= ? AND so.create_time <= ?',
      [startTime, endTime]
    );
  }

  findByType(type: 'retail' | 'wholesale' | 'credit'): SaleOrder[] {
    return this.findWithItemsList('so.type = ?', [type]);
  }

  findByStatus(status: 'pending' | 'paid' | 'partial' | 'void'): SaleOrder[] {
    return this.findWithItemsList('so.status = ?', [status]);
  }

  findByProjectId(projectId: number): SaleOrder[] {
    return this.findWithItemsList('so.project_id = ?', [projectId]);
  }
}
