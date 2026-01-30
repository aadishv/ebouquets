import { createStore } from '@xstate/store';

export interface FlowerOrder {
  "flower type": string;
  message: string;
  to: string;
  name: string;
}

export interface ProcessedFlowerOrder extends FlowerOrder {
  flowers: string[]; // URLs of individual flower images
  bouquetImage?: string; // Data URL of generated bouquet
}

interface StoreContext {
  orders: FlowerOrder[];
  processedOrders: ProcessedFlowerOrder[];
  bouquets: Record<string, string>; // Map recipient email to bouquet data URL
  error: string | null;
}

const STORAGE_KEY = 'ebouqet-storage';

const getInitialState = (): StoreContext => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        orders: parsed.orders || [],
        processedOrders: parsed.processedOrders || [],
        bouquets: parsed.bouquets || {},
        error: parsed.error || null,
      };
    } catch (e) {
      console.error('Failed to parse stored state', e);
    }
  }
  return {
    orders: [],
    processedOrders: [],
    bouquets: {},
    error: null,
  };
};

export const store = createStore({
  context: getInitialState(),
  on: {
    setOrders: (context, event: { orders: FlowerOrder[] }) => ({
      ...context,
      orders: event.orders,
      processedOrders: [],
      error: null,
    }),
    setProcessedOrders: (context, event: { processed: ProcessedFlowerOrder[] }) => ({
      ...context,
      processedOrders: event.processed,
    }),
    setBouquets: (context, event: { bouquets: Record<string, string> }) => ({
      ...context,
      bouquets: event.bouquets,
    }),
    setError: (context, event: { error: string | null }) => ({
      ...context,
      error: event.error,
    }),
    reset: () => ({
      orders: [],
      processedOrders: [],
      bouquets: {},
      error: null,
    }),
  },
});

// Sync with local storage
store.subscribe((state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.context));
});
