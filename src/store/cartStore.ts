import { create } from 'zustand';
import type { CartItem, Product } from '../../shared/types';
import { UnitConvertService } from '../../shared/UnitConvertService';

interface CartState {
  items: CartItem[];
  isWholesale: boolean;
  addItem: (product: Product, quantity?: number) => void;
  updateItemQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  toggleWholesale: () => void;
  setWholesale: (value: boolean) => void;
  getTotalAmount: () => number;
  getTotalItems: () => number;
  updateItem: (productId: number, updates: Partial<CartItem>) => void;
}

const recalculateItem = (product: Product, quantity: number, isWholesale: boolean): CartItem => {
  return UnitConvertService.createCartItem(product, quantity, isWholesale);
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isWholesale: false,

  addItem: (product: Product, quantity = 1) => {
    const { items, isWholesale } = get();
    const existingItem = items.find((item) => item.product.id === product.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const updatedItem = recalculateItem(product, newQuantity, isWholesale);
      
      set({
        items: items.map((item) =>
          item.product.id === product.id ? updatedItem : item
        ),
      });
    } else {
      const newItem = recalculateItem(product, quantity, isWholesale);
      set({ items: [...items, newItem] });
    }
  },

  updateItemQuantity: (productId: number, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const { items, isWholesale } = get();
    set({
      items: items.map((item) => {
        if (item.product.id === productId) {
          return recalculateItem(item.product, quantity, isWholesale);
        }
        return item;
      }),
    });
  },

  updateItem: (productId: number, updates: Partial<CartItem>) => {
    const { items, isWholesale } = get();
    set({
      items: items.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = updates.quantity ?? item.quantity;
          return recalculateItem(item.product, newQuantity, isWholesale);
        }
        return item;
      }),
    });
  },

  removeItem: (productId: number) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  clearCart: () => {
    set({ items: [] });
  },

  toggleWholesale: () => {
    const { isWholesale, items } = get();
    const newIsWholesale = !isWholesale;

    const updatedItems = items.map((item) => 
      recalculateItem(item.product, item.quantity, newIsWholesale)
    );

    set({ isWholesale: newIsWholesale, items: updatedItems });
  },

  setWholesale: (value: boolean) => {
    const { items } = get();

    const updatedItems = items.map((item) => 
      recalculateItem(item.product, item.quantity, value)
    );

    set({ isWholesale: value, items: updatedItems });
  },

  getTotalAmount: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.amount, 0);
  },

  getTotalItems: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.quantity, 0);
  },
}));
