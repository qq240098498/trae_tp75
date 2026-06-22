import { create } from 'zustand';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface UiState {
  sidebarOpen: boolean;
  currentPage: string;
  loadingCount: number;
  toasts: Toast[];
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  startLoading: () => void;
  stopLoading: () => void;
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  hideToast: (id: number) => void;
  isLoading: () => boolean;
}

let toastId = 0;

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  currentPage: 'dashboard',
  loadingCount: 0,
  toasts: [],

  openSidebar: () => {
    set({ sidebarOpen: true });
  },

  closeSidebar: () => {
    set({ sidebarOpen: false });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setCurrentPage: (page: string) => {
    set({ currentPage: page });
  },

  startLoading: () => {
    set((state) => ({ loadingCount: state.loadingCount + 1 }));
  },

  stopLoading: () => {
    set((state) => ({ loadingCount: Math.max(0, state.loadingCount - 1) }));
  },

  showToast: (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = ++toastId;
    const toast: Toast = { id, message, type, duration };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, duration);
    }
  },

  hideToast: (id: number) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  isLoading: () => {
    return get().loadingCount > 0;
  },
}));
