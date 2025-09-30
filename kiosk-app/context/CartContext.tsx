import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Option { id: number; name: string; price: number; }
export interface OptionGroup { id: number; name: string; options: Option[]; }
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  categoryId: number | null;
  optionGroups?: OptionGroup[];
}
export type SelectedOptions = Record<string, { optionId: number; optionName: string; price: number }>;
export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions: SelectedOptions;
  itemTotalPrice: number;
}
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number, selectedOptions: SelectedOptions) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, quantity: number, selectedOptions: SelectedOptions) => {
    const optionIds = Object.values(selectedOptions).map(opt => opt.optionId).sort().join('-');
    const cartItemId = `${product.id}-${optionIds}`;
    const optionsPrice = Object.values(selectedOptions).reduce((sum, opt) => sum + opt.price, 0);
    const itemTotalPrice = product.price + optionsPrice;
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === cartItemId);
      if (existingItem) {
        return prevItems.map(item => 
          item.id === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        const newItem: CartItem = { id: cartItemId, product, quantity, selectedOptions, itemTotalPrice };
        return [...prevItems, newItem];
      }
    });
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    setCartItems((prevItems) => {
      if (newQuantity <= 0) {
        return prevItems.filter((item) => item.id !== cartItemId);
      }
      return prevItems.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const clearCart = () => setCartItems([]);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.itemTotalPrice * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, updateQuantity, clearCart, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};