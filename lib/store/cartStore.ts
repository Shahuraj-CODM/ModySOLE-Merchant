import { create } from 'zustand';
import api from '../api';

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image_url: string;
  size?: string;
  quantity: number;
  type: string;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  promoCode: string;
  discount: number;

  fetchCart: () => Promise<void>;
  addItem: (productId: string, size?: string, qty?: number) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyPromo: (code: string) => Promise<void>;
  clearPromo: () => void;

  get subtotal(): number;
  get shipping(): number;
  get total(): number;
  get count(): number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  promoCode: '',
  discount: 0,

  get subtotal() {
    return get().items.reduce((s, i) => s + i.price * i.quantity, 0);
  },
  get shipping() {
    return get().subtotal > 999 ? 0 : 99;
  },
  get total() {
    return get().subtotal - get().discount + get().shipping;
  },
  get count() {
    return get().items.reduce((s, i) => s + i.quantity, 0);
  },

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/cart');
      set({ items: data.items });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, size, qty = 1) => {
    await api.post('/api/cart', { product_id: productId, size, quantity: qty });
    await get().fetchCart();
  },

  updateQty: async (itemId, qty) => {
    await api.patch(`/api/cart/${itemId}`, { quantity: qty });
    if (qty <= 0) {
      set((s) => ({ items: s.items.filter((i) => i.id !== itemId) }));
    } else {
      set((s) => ({
        items: s.items.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i)),
      }));
    }
  },

  removeItem: async (itemId) => {
    await api.delete(`/api/cart/${itemId}`);
    set((s) => ({ items: s.items.filter((i) => i.id !== itemId) }));
  },

  applyPromo: async (code) => {
    const subtotal = get().subtotal;
    const { data } = await api.post('/api/cart/validate-promo', { code, subtotal });
    set({ promoCode: code, discount: data.promo.discount });
  },

  clearPromo: () => set({ promoCode: '', discount: 0 }),
}));
