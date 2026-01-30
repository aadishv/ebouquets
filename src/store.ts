import { createStore } from '@xstate/store';

export interface FlowerOrder {
  "flower type": string;
  message: string;
  to: string;
}

interface StoreContext {
  orders: FlowerOrder[];
  error: string | null;
}

const STORAGE_KEY = 'ebouqet-storage';

const getInitialState = (): StoreContext => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored state', e);
    }
  }
  return {
    orders: [],
    error: null,
  };
};

export const store = createStore({
  context: getInitialState(),
  on: {
    setOrders: (context, event: { orders: FlowerOrder[] }) => ({
      ...context,
      orders: event.orders,
      error: null,
    }),
    setError: (context, event: { error: string | null }) => ({
      ...context,
      error: event.error,
    }),
    reset: () => ({
      orders: [],
      error: null,
    }),
  },
});

// Sync with local storage
store.subscribe((state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.context));
});
