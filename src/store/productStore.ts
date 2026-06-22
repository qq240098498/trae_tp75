import { create } from 'zustand';
import type { Product, Category, PaginatedResponse } from '../../shared/types';
import { productApi, categoryApi } from '../lib/api';

interface ProductState {
  products: Product[];
  categories: Category[];
  categoryTree: Category[];
  currentProduct: Product | null;
  loading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  fetchProducts: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    categoryId?: number;
  }) => Promise<void>;
  fetchCategoryTree: () => Promise<void>;
  createProduct: (data: Omit<Product, 'id' | 'createTime' | 'updateTime'>) => Promise<boolean>;
  updateProduct: (id: number, data: Partial<Omit<Product, 'id' | 'createTime' | 'updateTime'>>) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;
  setCurrentProduct: (product: Product | null) => void;
  clearCurrentProduct: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  categoryTree: [],
  currentProduct: null,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
  },

  fetchProducts: async (params) => {
    set({ loading: true });
    try {
      const response = await productApi.getProducts(params);
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Product>;
        set({
          products: data.items,
          pagination: {
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
          },
        });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchCategoryTree: async () => {
    set({ loading: true });
    try {
      const response = await categoryApi.getCategoryTree();
      if (response.success && response.data) {
        set({ categoryTree: response.data as Category[] });
      }
    } finally {
      set({ loading: false });
    }
  },

  createProduct: async (data) => {
    set({ loading: true });
    try {
      const response = await productApi.createProduct(data);
      if (response.success && response.data) {
        set((state) => ({
          products: [response.data as Product, ...state.products],
        }));
        return true;
      }
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateProduct: async (id, data) => {
    set({ loading: true });
    try {
      const response = await productApi.updateProduct(id, data);
      if (response.success && response.data) {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? (response.data as Product) : p
          ),
        }));
        return true;
      }
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true });
    try {
      const response = await productApi.deleteProduct(id);
      if (response.success) {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
        return true;
      }
      return false;
    } finally {
      set({ loading: false });
    }
  },

  setCurrentProduct: (product) => {
    set({ currentProduct: product });
  },

  clearCurrentProduct: () => {
    set({ currentProduct: null });
  },
}));
