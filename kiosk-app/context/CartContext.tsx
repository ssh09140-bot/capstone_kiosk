import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  options?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption: string | null;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, selectedOption: string | null) => void;
  updateQuantity: (productId: string, selectedOption: string | null, newQuantity: number) => void; // ### 수량 조절 함수 ###
  clearCart: () => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, selectedOption: string | null) => {
    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedOption === selectedOption
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        const updatedItem = { ...existingItem, quantity: existingItem.quantity + 1 };
        updatedItems[existingItemIndex] = updatedItem;
        return updatedItems;
      } else {
        const newItem: CartItem = { product, quantity: 1, selectedOption };
        return [...prevItems, newItem];
      }
    });
  };

  // ### --- 수량을 조절하고, 0이 되면 삭제하는 함수 (새로 추가/변경) --- ###
  const updateQuantity = (productId: string, selectedOption: string | null, newQuantity: number) => {
    setCartItems((prevItems) => {
      // 수량이 0 이하이면, 해당 아이템을 장바구니에서 완전히 제거합니다.
      if (newQuantity <= 0) {
        return prevItems.filter(
          (item) =>
            item.product.id !== productId || item.selectedOption !== selectedOption
        );
      }

      // 수량이 1 이상이면, 해당 아이템의 quantity 값만 업데이트합니다.
      return prevItems.map((item) => {
        if (item.product.id === productId && item.selectedOption === selectedOption) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };
  
  const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, updateQuantity, clearCart, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};