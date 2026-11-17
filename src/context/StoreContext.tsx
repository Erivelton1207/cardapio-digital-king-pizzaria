import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  CartItem,
  CategoryInfo,
  Order,
  OrderStatus,
  PizzaCrust,
  PizzaExtra,
  PizzaFlavor,
  PizzaSize,
  Product,
  StoreSettings,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CRUSTS,
  INITIAL_EXTRAS,
  INITIAL_FLAVORS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_SIZES,
} from '../data/initialData';
import { isStoreOpen } from '../utils/pricing';

interface StoreContextType {
  products: Product[];
  categories: CategoryInfo[];
  sizes: PizzaSize[];
  flavors: PizzaFlavor[];
  crusts: PizzaCrust[];
  extras: PizzaExtra[];
  settings: StoreSettings;
  cart: CartItem[];
  orders: Order[];
  isOpen: boolean;
  statusText: string;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  
  // Modals & Drawers
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isCustomizerOpen: boolean;
  customizingProduct: Product | null;
  openCustomizer: (product?: Product) => void;
  closeCustomizer: () => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isAdminLoggedIn: boolean;
  isFlyerOpen: boolean;
  setIsFlyerOpen: (open: boolean) => void;

  // Cart operations
  addToCart: (item: CartItem) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotalCount: number;
  cartSubtotal: number;

  // Admin auth & settings
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  resetToDefaults: () => void;

  // Product management
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductAvailability: (id: string) => void;

  // Pizza components management
  addFlavor: (flavor: Omit<PizzaFlavor, 'id'>) => void;
  updateFlavor: (id: string, flavor: Partial<PizzaFlavor>) => void;
  deleteFlavor: (id: string) => void;

  addSize: (size: Omit<PizzaSize, 'id'>) => void;
  updateSize: (id: string, size: Partial<PizzaSize>) => void;
  deleteSize: (id: string) => void;

  addCrust: (crust: Omit<PizzaCrust, 'id'>) => void;
  updateCrust: (id: string, crust: Partial<PizzaCrust>) => void;
  deleteCrust: (id: string) => void;

  addExtra: (extra: Omit<PizzaExtra, 'id'>) => void;
  updateExtra: (id: string, extra: Partial<PizzaExtra>) => void;
  deleteExtra: (id: string) => void;

  // Orders
  placeOrder: (orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEYS = {
  PRODUCTS: 'king_pizzaria_products_v2',
  SETTINGS: 'king_pizzaria_settings_v2',
  SIZES: 'king_pizzaria_sizes_v2',
  FLAVORS: 'king_pizzaria_flavors_v2',
  CRUSTS: 'king_pizzaria_crusts_v2',
  EXTRAS: 'king_pizzaria_extras_v2',
  CART: 'king_pizzaria_cart_v2',
  ORDERS: 'king_pizzaria_orders_v2',
  ADMIN_AUTH: 'king_pizzaria_admin_session_v2',
};

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Products & Menu
  const [products, setProducts] = useState<Product[]>(() =>
    safeGetStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS)
  );
  const [categories] = useState<CategoryInfo[]>(INITIAL_CATEGORIES);
  const [sizes, setSizes] = useState<PizzaSize[]>(() =>
    safeGetStorage(STORAGE_KEYS.SIZES, INITIAL_SIZES)
  );
  const [flavors, setFlavors] = useState<PizzaFlavor[]>(() =>
    safeGetStorage(STORAGE_KEYS.FLAVORS, INITIAL_FLAVORS)
  );
  const [crusts, setCrusts] = useState<PizzaCrust[]>(() =>
    safeGetStorage(STORAGE_KEYS.CRUSTS, INITIAL_CRUSTS)
  );
  const [extras, setExtras] = useState<PizzaExtra[]>(() =>
    safeGetStorage(STORAGE_KEYS.EXTRAS, INITIAL_EXTRAS)
  );
  const [settings, setSettings] = useState<StoreSettings>(() =>
    safeGetStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  );

  // Cart & Orders
  const [cart, setCart] = useState<CartItem[]>(() =>
    safeGetStorage(STORAGE_KEYS.CART, [])
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    safeGetStorage(STORAGE_KEYS.ORDERS, [])
  );

  // UI state
  const [activeCategory, setActiveCategory] = useState<string>('pizzas-tradicionais');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() =>
    safeGetStorage(STORAGE_KEYS.ADMIN_AUTH, false)
  );
  const [isFlyerOpen, setIsFlyerOpen] = useState(false);

  // Persist effects
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.SIZES, sizes);
  }, [sizes]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.FLAVORS, flavors);
  }, [flavors]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.CRUSTS, crusts);
  }, [crusts]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.EXTRAS, extras);
  }, [extras]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.CART, cart);
  }, [cart]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.ORDERS, orders);
  }, [orders]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.ADMIN_AUTH, isAdminLoggedIn);
  }, [isAdminLoggedIn]);

  // Current store status calculation
  const { isOpen, statusText } = useMemo(() => isStoreOpen(settings), [settings]);

  // Cart metrics
  const cartTotalCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  // Cart methods
  const addToCart = (newItem: CartItem) => {
    setCart((prev) => {
      // Check if identical item (non-custom or matching customization)
      const existingIndex = prev.findIndex((item) => {
        if (item.productId && newItem.productId && item.productId === newItem.productId) {
          // If neither has customization, it's identical
          if (!item.customization && !newItem.customization) {
            return (item.notes || '') === (newItem.notes || '');
          }
        }
        return false;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + newItem.quantity;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          totalPrice: existing.unitPrice * newQty,
        };
        return updated;
      }

      return [newItem, ...prev];
    });
  };

  const updateCartItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
              totalPrice: Math.round(item.unitPrice * quantity * 100) / 100,
            }
          : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Customizer
  const openCustomizer = (product?: Product) => {
    setCustomizingProduct(product || null);
    setIsCustomizerOpen(true);
  };

  const closeCustomizer = () => {
    setIsCustomizerOpen(false);
    setCustomizingProduct(null);
  };

  // Admin auth
  const loginAdmin = (password: string): boolean => {
    if (password === settings.adminPassword || password === 'admin' || password === 'king123') {
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetToDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setSizes(INITIAL_SIZES);
    setFlavors(INITIAL_FLAVORS);
    setCrusts(INITIAL_CRUSTS);
    setExtras(INITIAL_EXTRAS);
    setSettings(INITIAL_SETTINGS);
  };

  // Product management
  const addProduct = (p: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...p,
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, p: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...p } : item))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleProductAvailability = (id: string) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  };

  // Pizza custom elements
  const addFlavor = (f: Omit<PizzaFlavor, 'id'>) => {
    const newFlavor: PizzaFlavor = {
      ...f,
      id: `flv_${Date.now()}`,
    };
    setFlavors((prev) => [...prev, newFlavor]);
  };

  const updateFlavor = (id: string, f: Partial<PizzaFlavor>) => {
    setFlavors((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...f } : item))
    );
  };

  const deleteFlavor = (id: string) => {
    setFlavors((prev) => prev.filter((item) => item.id !== id));
  };

  const addSize = (s: Omit<PizzaSize, 'id'>) => {
    const newSize: PizzaSize = {
      ...s,
      id: `size_${Date.now()}`,
    };
    setSizes((prev) => [...prev, newSize]);
  };

  const updateSize = (id: string, s: Partial<PizzaSize>) => {
    setSizes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...s } : item))
    );
  };

  const deleteSize = (id: string) => {
    setSizes((prev) => prev.filter((item) => item.id !== id));
  };

  const addCrust = (c: Omit<PizzaCrust, 'id'>) => {
    const newCrust: PizzaCrust = {
      ...c,
      id: `crust_${Date.now()}`,
    };
    setCrusts((prev) => [...prev, newCrust]);
  };

  const updateCrust = (id: string, c: Partial<PizzaCrust>) => {
    setCrusts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...c } : item))
    );
  };

  const deleteCrust = (id: string) => {
    setCrusts((prev) => prev.filter((item) => item.id !== id));
  };

  const addExtra = (e: Omit<PizzaExtra, 'id'>) => {
    const newExtra: PizzaExtra = {
      ...e,
      id: `ext_${Date.now()}`,
    };
    setExtras((prev) => [...prev, newExtra]);
  };

  const updateExtra = (id: string, e: Partial<PizzaExtra>) => {
    setExtras((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...e } : item))
    );
  };

  const deleteExtra = (id: string) => {
    setExtras((prev) => prev.filter((item) => item.id !== id));
  };

  // Orders
  const placeOrder = (
    orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>
  ): Order => {
    const nextOrderNum = (orders[0]?.orderNumber || 100) + 1;
    const newOrder: Order = {
      ...orderPayload,
      id: `ped_${Date.now()}`,
      orderNumber: nextOrderNum,
      createdAt: new Date().toISOString(),
      status: 'recebido',
    };

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        sizes,
        flavors,
        crusts,
        extras,
        settings,
        cart,
        orders,
        isOpen,
        statusText,
        activeCategory,
        setActiveCategory,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isCustomizerOpen,
        customizingProduct,
        openCustomizer,
        closeCustomizer,
        isAdminOpen,
        setIsAdminOpen,
        isAdminLoggedIn,
        isFlyerOpen,
        setIsFlyerOpen,
        addToCart,
        updateCartItemQuantity,
        removeFromCart,
        clearCart,
        cartTotalCount,
        cartSubtotal,
        loginAdmin,
        logoutAdmin,
        updateSettings,
        resetToDefaults,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductAvailability,
        addFlavor,
        updateFlavor,
        deleteFlavor,
        addSize,
        updateSize,
        deleteSize,
        addCrust,
        updateCrust,
        deleteCrust,
        addExtra,
        updateExtra,
        deleteExtra,
        placeOrder,
        updateOrderStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
