import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number; // Tiempo en ms
}

interface ToastState {
  toasts: ToastOptions[];
  showToast: (title: string, message?: string, type?: ToastType, duration?: number) => string;
  hideToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  showToast: (title, message, type = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, title, message, type, duration }],
    }));

    // Auto eliminar el toast después de la duración
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);

    return id;
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
