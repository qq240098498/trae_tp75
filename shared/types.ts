export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  level: 1 | 2 | 3;
  sort: number;
  children?: Category[];
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  categoryId: number;
  barcode: string;
  unitType: 'piece' | 'weight' | 'length';
  baseUnit: string;
  saleUnit: string;
  wholeUnit: string;
  unitRate: number;
  wholeRate: number;
  pieceWeight: number;
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
  minUnitPrice: number;
  stock: number;
  warningStock: number;
  createTime: number;
  updateTime: number;
  categoryName?: string;
  specName?: string;
  brandName?: string;
}

export interface Project {
  id: number;
  name: string;
  address: string;
  contact: string;
  phone: string;
  dueDate: number;
  totalDebt: number;
  paidAmount: number;
  status: 'active' | 'completed' | 'overdue';
  remark: string;
  createTime: number;
  remainingDebt?: number;
  daysRemaining?: number;
}

export interface ProjectPayment {
  id: number;
  projectId: number;
  amount: number;
  payMethod: string;
  remark: string;
  operatorId: number;
  createTime: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  address: string;
  mainCategory: string;
  creditRating: 'A' | 'B' | 'C';
  remark: string;
  createTime: number;
}

export interface SaleOrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
  amount: number;
  unitType: 'piece' | 'weight' | 'length';
  unitInfo: string;
}

export interface SaleOrder {
  id?: number;
  orderNo?: string;
  type: 'retail' | 'wholesale' | 'credit';
  projectId?: number;
  items: SaleOrderItem[];
  totalAmount: number;
  discount: number;
  actualAmount: number;
  paidAmount: number;
  payMethod: 'cash' | 'wechat' | 'alipay' | 'card' | 'credit';
  status: 'pending' | 'paid' | 'partial' | 'void';
  operatorId: number;
  createTime?: number;
  projectName?: string;
  operatorName?: string;
}

export interface PurchaseOrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  stockInQty: number;
}

export interface PurchaseOrder {
  id?: number;
  orderNo?: string;
  supplierId: number;
  items: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount: number;
  payMethod: 'cash' | 'transfer' | 'credit';
  status: 'pending' | 'partial' | 'paid';
  stockStatus: 'pending' | 'partial' | 'completed';
  operatorId: number;
  createTime?: number;
  supplierName?: string;
  operatorName?: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier' | 'stock';
  name: string;
  createTime: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  warningProducts: number;
  overdueProjects: number;
  pendingReceivable: number;
  monthSales: number;
  recentOrders: SaleOrder[];
  lowStockProducts: Product[];
  dueSoonProjects: Project[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  amount: number;
  unitInfo: string;
  baseQuantity: number;
}

export const UNIT_TYPE_LABELS: Record<string, string> = {
  piece: '按个',
  weight: '按斤',
  length: '按米'
};

export const PAY_METHOD_LABELS: Record<string, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  card: '刷卡',
  credit: '挂账',
  transfer: '转账'
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  retail: '散卖',
  wholesale: '批发',
  credit: '挂账'
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  partial: '部分付款',
  void: '已作废'
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  completed: '已结清',
  overdue: '已逾期'
};

export const CREDIT_RATING_LABELS: Record<string, string> = {
  A: '优秀',
  B: '良好',
  C: '一般'
};

export const ROLE_LABELS: Record<string, string> = {
  admin: '店长',
  cashier: '收银员',
  stock: '库管员'
};
