import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { AuthController } from '../controllers/AuthController.js';
import { CategoryController } from '../controllers/CategoryController.js';
import { ProductController } from '../controllers/ProductController.js';
import { SaleController } from '../controllers/SaleController.js';
import { ProjectController } from '../controllers/ProjectController.js';
import { SupplierController } from '../controllers/SupplierController.js';
import { PurchaseController } from '../controllers/PurchaseController.js';

const router = Router();

router.post('/auth/login', AuthController.login);
router.get('/auth/me', authMiddleware, AuthController.getCurrentUser);
router.post('/auth/logout', authMiddleware, AuthController.logout);

router.get('/categories', authMiddleware, CategoryController.list);
router.get('/categories/tree', authMiddleware, CategoryController.tree);
router.get('/categories/:id', authMiddleware, CategoryController.getById);
router.post('/categories', authMiddleware, roleMiddleware(['admin']), CategoryController.create);
router.put('/categories/:id', authMiddleware, roleMiddleware(['admin']), CategoryController.update);
router.delete('/categories/:id', authMiddleware, roleMiddleware(['admin']), CategoryController.delete);

router.get('/products', authMiddleware, ProductController.list);
router.get('/products/low-stock', authMiddleware, ProductController.lowStock);
router.get('/products/barcode/:barcode', authMiddleware, ProductController.getByBarcode);
router.get('/products/:id', authMiddleware, ProductController.getById);
router.post('/products', authMiddleware, roleMiddleware(['admin', 'stock']), ProductController.create);
router.put('/products/:id', authMiddleware, roleMiddleware(['admin', 'stock']), ProductController.update);
router.delete('/products/:id', authMiddleware, roleMiddleware(['admin']), ProductController.delete);

router.get('/sale/orders', authMiddleware, SaleController.list);
router.get('/sale/orders/recent', authMiddleware, SaleController.getRecent);
router.get('/sale/orders/:id', authMiddleware, SaleController.getById);
router.post('/sale/retail', authMiddleware, roleMiddleware(['admin', 'cashier']), SaleController.createRetail);
router.post('/sale/wholesale', authMiddleware, roleMiddleware(['admin', 'cashier']), SaleController.createWholesale);
router.post('/sale/credit', authMiddleware, roleMiddleware(['admin', 'cashier']), SaleController.createCredit);
router.put('/sale/orders/:id/payment', authMiddleware, SaleController.updatePayment);
router.put('/sale/orders/:id/void', authMiddleware, roleMiddleware(['admin']), SaleController.voidOrder);

router.get('/projects', authMiddleware, ProjectController.list);
router.get('/projects/due-soon', authMiddleware, ProjectController.getDueSoon);
router.get('/projects/overdue', authMiddleware, ProjectController.getOverdue);
router.get('/projects/:id', authMiddleware, ProjectController.getById);
router.post('/projects', authMiddleware, roleMiddleware(['admin', 'cashier']), ProjectController.create);
router.put('/projects/:id', authMiddleware, roleMiddleware(['admin', 'cashier']), ProjectController.update);
router.delete('/projects/:id', authMiddleware, roleMiddleware(['admin']), ProjectController.delete);
router.post('/projects/:id/payment', authMiddleware, ProjectController.addPayment);
router.put('/projects/:id/status', authMiddleware, roleMiddleware(['admin']), ProjectController.updateStatus);

router.get('/suppliers', authMiddleware, SupplierController.list);
router.get('/suppliers/all', authMiddleware, SupplierController.getAll);
router.get('/suppliers/:id', authMiddleware, SupplierController.getById);
router.post('/suppliers', authMiddleware, roleMiddleware(['admin', 'stock']), SupplierController.create);
router.put('/suppliers/:id', authMiddleware, roleMiddleware(['admin', 'stock']), SupplierController.update);
router.delete('/suppliers/:id', authMiddleware, roleMiddleware(['admin']), SupplierController.delete);

router.get('/purchase', authMiddleware, PurchaseController.list);
router.get('/purchase/pending-stock', authMiddleware, PurchaseController.getPendingStock);
router.get('/purchase/report', authMiddleware, roleMiddleware(['admin']), PurchaseController.getReport);
router.get('/purchase/:id', authMiddleware, PurchaseController.getById);
router.post('/purchase', authMiddleware, roleMiddleware(['admin', 'stock']), PurchaseController.create);
router.put('/purchase/:id', authMiddleware, roleMiddleware(['admin', 'stock']), PurchaseController.update);
router.post('/purchase/:id/stock-in', authMiddleware, roleMiddleware(['admin', 'stock']), PurchaseController.stockIn);
router.put('/purchase/:id/payment', authMiddleware, roleMiddleware(['admin']), PurchaseController.updatePayment);
router.delete('/purchase/:id', authMiddleware, roleMiddleware(['admin']), PurchaseController.delete);

router.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { query } = await import('../db/index.js');
    
    const todaySales = query(`
      SELECT COALESCE(SUM(actual_amount), 0) as total 
      FROM sale_orders 
      WHERE create_time >= ? AND status != 'void'
    `, [todayStart.toISOString()])[0]?.total || 0;

    const todayOrders = query(`
      SELECT COUNT(*) as count 
      FROM sale_orders 
      WHERE create_time >= ? AND status != 'void'
    `, [todayStart.toISOString()])[0]?.count || 0;

    const warningProducts = query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE stock <= warning_stock
    `)[0]?.count || 0;

    const overdueProjects = query(`
      SELECT COUNT(*) as count 
      FROM projects 
      WHERE status = 'overdue' OR (status = 'active' AND due_date < ?)
    `, [new Date().toISOString()])[0]?.count || 0;

    const pendingReceivable = query(`
      SELECT COALESCE(SUM(total_debt - paid_amount), 0) as total 
      FROM projects 
      WHERE total_debt > paid_amount
    `)[0]?.total || 0;

    const monthSales = query(`
      SELECT COALESCE(SUM(actual_amount), 0) as total 
      FROM sale_orders 
      WHERE create_time >= ? AND status != 'void'
    `, [monthStart.toISOString()])[0]?.total || 0;

    const recentOrders = query(`
      SELECT so.*, p.name as projectName, u.name as operatorName
      FROM sale_orders so
      LEFT JOIN projects p ON so.project_id = p.id
      LEFT JOIN users u ON so.operator_id = u.id
      ORDER BY so.create_time DESC
      LIMIT 10
    `);

    const lowStockProducts = query(`
      SELECT * FROM products 
      WHERE stock <= warning_stock
      ORDER BY stock ASC
      LIMIT 10
    `);

    const dueSoonProjects = query(`
      SELECT * FROM projects 
      WHERE status = 'active' AND due_date >= ? AND due_date <= ?
      ORDER BY due_date ASC
      LIMIT 10
    `, [new Date().toISOString(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()]);

    res.json({
      success: true,
      data: {
        todaySales,
        todayOrders,
        warningProducts,
        overdueProjects,
        pendingReceivable,
        monthSales,
        recentOrders,
        lowStockProducts,
        dueSoonProjects
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
