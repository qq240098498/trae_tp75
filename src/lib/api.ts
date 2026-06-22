import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  ApiResponse,
  Category,
  Product,
  Project,
  ProjectPayment,
  Supplier,
  SaleOrder,
  PurchaseOrder,
  User,
  LoginResponse,
  DashboardStats,
  PaginatedResponse,
} from '../../shared/types';

const TOKEN_KEY = 'auth_token';
const AUTH_HEADER = 'x-auth-token';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers[AUTH_HEADER] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function responseHandler<T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> {
  return response.data;
}

export const authApi = {
  login: (username: string, password: string): Promise<ApiResponse<LoginResponse>> =>
    api.post('/auth/login', { username, password }).then((res) => responseHandler<LoginResponse>(res)),

  logout: (): Promise<ApiResponse<void>> =>
    api.post('/auth/logout').then((res) => responseHandler<void>(res)),

  getCurrentUser: (): Promise<ApiResponse<User>> =>
    api.get('/auth/me').then((res) => responseHandler<User>(res)),
};

export const categoryApi = {
  getCategoryTree: (): Promise<ApiResponse<Category[]>> =>
    api.get('/categories/tree').then((res) => responseHandler<Category[]>(res)),

  getCategories: (page?: number, pageSize?: number): Promise<ApiResponse<PaginatedResponse<Category>>> =>
    api.get('/categories', { params: { page, pageSize } }).then((res) => responseHandler<PaginatedResponse<Category>>(res)),

  createCategory: (data: Omit<Category, 'id' | 'level' | 'children'>): Promise<ApiResponse<Category>> =>
    api.post('/categories', data).then((res) => responseHandler<Category>(res)),

  updateCategory: (id: number, data: Partial<Omit<Category, 'id'>>): Promise<ApiResponse<Category>> =>
    api.put(`/categories/${id}`, data).then((res) => responseHandler<Category>(res)),

  deleteCategory: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/categories/${id}`).then((res) => responseHandler<void>(res)),
};

export const productApi = {
  getProducts: (params?: {
    page?: number;
    pageSize?: number;
    categoryId?: number;
    keyword?: string;
  }): Promise<ApiResponse<PaginatedResponse<Product>>> =>
    api.get('/products', { params }).then((res) => responseHandler<PaginatedResponse<Product>>(res)),

  getProduct: (id: number): Promise<ApiResponse<Product>> =>
    api.get(`/products/${id}`).then((res) => responseHandler<Product>(res)),

  getProductByBarcode: (barcode: string): Promise<ApiResponse<Product>> =>
    api.get(`/products/barcode/${barcode}`).then((res) => responseHandler<Product>(res)),

  createProduct: (data: Omit<Product, 'id' | 'createTime' | 'updateTime'>): Promise<ApiResponse<Product>> =>
    api.post('/products', data).then((res) => responseHandler<Product>(res)),

  updateProduct: (id: number, data: Partial<Omit<Product, 'id'>>): Promise<ApiResponse<Product>> =>
    api.put(`/products/${id}`, data).then((res) => responseHandler<Product>(res)),

  deleteProduct: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/products/${id}`).then((res) => responseHandler<void>(res)),

  getLowStockProducts: (): Promise<ApiResponse<Product[]>> =>
    api.get('/products/low-stock').then((res) => responseHandler<Product[]>(res)),
};

export const saleApi = {
  getSaleOrders: (params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
  }): Promise<ApiResponse<PaginatedResponse<SaleOrder>>> =>
    api.get('/sale/orders', { params }).then((res) => responseHandler<PaginatedResponse<SaleOrder>>(res)),

  getSaleOrder: (id: number): Promise<ApiResponse<SaleOrder>> =>
    api.get(`/sale/orders/${id}`).then((res) => responseHandler<SaleOrder>(res)),

  createRetailSale: (data: Omit<SaleOrder, 'id' | 'orderNo' | 'type' | 'createTime'>): Promise<ApiResponse<SaleOrder>> =>
    api.post('/sale/retail', { ...data, type: 'retail' }).then((res) => responseHandler<SaleOrder>(res)),

  createWholesaleSale: (data: Omit<SaleOrder, 'id' | 'orderNo' | 'type' | 'createTime'>): Promise<ApiResponse<SaleOrder>> =>
    api.post('/sale/wholesale', { ...data, type: 'wholesale' }).then((res) => responseHandler<SaleOrder>(res)),

  createCreditSale: (data: Omit<SaleOrder, 'id' | 'orderNo' | 'type' | 'createTime'>): Promise<ApiResponse<SaleOrder>> =>
    api.post('/sale/credit', { ...data, type: 'credit' }).then((res) => responseHandler<SaleOrder>(res)),

  updatePayment: (id: number, data: { paidAmount: number; payMethod: string }): Promise<ApiResponse<SaleOrder>> =>
    api.put(`/sale/orders/${id}/payment`, data).then((res) => responseHandler<SaleOrder>(res)),

  voidOrder: (id: number): Promise<ApiResponse<void>> =>
    api.put(`/sale/orders/${id}/void`).then((res) => responseHandler<void>(res)),
};

export const projectApi = {
  getProjects: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }): Promise<ApiResponse<PaginatedResponse<Project>>> =>
    api.get('/projects', { params }).then((res) => responseHandler<PaginatedResponse<Project>>(res)),

  getProject: (id: number): Promise<ApiResponse<Project>> =>
    api.get(`/projects/${id}`).then((res) => responseHandler<Project>(res)),

  createProject: (data: Omit<Project, 'id' | 'createTime' | 'remainingDebt' | 'daysRemaining'>): Promise<ApiResponse<Project>> =>
    api.post('/projects', data).then((res) => responseHandler<Project>(res)),

  updateProject: (id: number, data: Partial<Omit<Project, 'id'>>): Promise<ApiResponse<Project>> =>
    api.put(`/projects/${id}`, data).then((res) => responseHandler<Project>(res)),

  deleteProject: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/projects/${id}`).then((res) => responseHandler<void>(res)),

  addProjectPayment: (id: number, data: Omit<ProjectPayment, 'id' | 'projectId' | 'createTime' | 'operatorId'>): Promise<ApiResponse<ProjectPayment>> =>
    api.post(`/projects/${id}/payment`, data).then((res) => responseHandler<ProjectPayment>(res)),

  getDueSoonProjects: (): Promise<ApiResponse<Project[]>> =>
    api.get('/projects/due-soon').then((res) => responseHandler<Project[]>(res)),

  getOverdueProjects: (): Promise<ApiResponse<Project[]>> =>
    api.get('/projects/overdue').then((res) => responseHandler<Project[]>(res)),
};

export const supplierApi = {
  getSuppliers: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<PaginatedResponse<Supplier>>> =>
    api.get('/suppliers', { params }).then((res) => responseHandler<PaginatedResponse<Supplier>>(res)),

  getAllSuppliers: (): Promise<ApiResponse<Supplier[]>> =>
    api.get('/suppliers/all').then((res) => responseHandler<Supplier[]>(res)),

  getSupplier: (id: number): Promise<ApiResponse<Supplier>> =>
    api.get(`/suppliers/${id}`).then((res) => responseHandler<Supplier>(res)),

  createSupplier: (data: Omit<Supplier, 'id' | 'createTime'>): Promise<ApiResponse<Supplier>> =>
    api.post('/suppliers', data).then((res) => responseHandler<Supplier>(res)),

  updateSupplier: (id: number, data: Partial<Omit<Supplier, 'id'>>): Promise<ApiResponse<Supplier>> =>
    api.put(`/suppliers/${id}`, data).then((res) => responseHandler<Supplier>(res)),

  deleteSupplier: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/suppliers/${id}`).then((res) => responseHandler<void>(res)),
};

export const purchaseApi = {
  getPurchaseOrders: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    stockStatus?: string;
    supplierId?: number;
    startDate?: number;
    endDate?: number;
  }): Promise<ApiResponse<PaginatedResponse<PurchaseOrder>>> =>
    api.get('/purchase', { params }).then((res) => responseHandler<PaginatedResponse<PurchaseOrder>>(res)),

  getPurchaseOrder: (id: number): Promise<ApiResponse<PurchaseOrder>> =>
    api.get(`/purchase/${id}`).then((res) => responseHandler<PurchaseOrder>(res)),

  createPurchaseOrder: (data: Omit<PurchaseOrder, 'id' | 'orderNo' | 'createTime'>): Promise<ApiResponse<PurchaseOrder>> =>
    api.post('/purchase', data).then((res) => responseHandler<PurchaseOrder>(res)),

  updatePurchaseOrder: (id: number, data: Partial<Omit<PurchaseOrder, 'id'>>): Promise<ApiResponse<PurchaseOrder>> =>
    api.put(`/purchase/${id}`, data).then((res) => responseHandler<PurchaseOrder>(res)),

  stockInPurchaseOrder: (id: number, data: { items: Array<{ id: number; stockInQty: number }>; operatorId: number }): Promise<ApiResponse<PurchaseOrder>> =>
    api.post(`/purchase/${id}/stock-in`, data).then((res) => responseHandler<PurchaseOrder>(res)),

  updatePurchasePayment: (id: number, data: { paidAmount: number; payMethod: string; operatorId: number }): Promise<ApiResponse<PurchaseOrder>> =>
    api.put(`/purchase/${id}/payment`, data).then((res) => responseHandler<PurchaseOrder>(res)),

  deletePurchaseOrder: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/purchase/${id}`).then((res) => responseHandler<void>(res)),
};

export const dashboardApi = {
  getDashboardStats: (): Promise<ApiResponse<DashboardStats>> =>
    api.get('/dashboard/stats').then((res) => responseHandler<DashboardStats>(res)),
};

export default api;
