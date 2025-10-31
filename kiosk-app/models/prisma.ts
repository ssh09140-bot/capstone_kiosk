// This file is manually synced with /kiosk-backend/prisma/schema.prisma
// TODO: Automate this synchronization

export interface Option {
  id: number;
  name: string;
  price: number;
}

export interface OptionGroup {
  id: number;
  name: string;
  options: Option[];
}

// Note: Product 'id' is a string here to align with expo-router's string-based params.
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  stock: number; // Added from product/index.tsx analysis
  categoryId: number | null;
  optionGroups?: OptionGroup[];
}

export interface Category {
  id: number | null;
  name: string;
}

export type SelectedOptions = Record<string, { optionId: number; optionName: string; price: number }>;

export interface CartItem {
  id: string; // Composite ID: `${product.id}-${optionIds}`
  product: Product;
  quantity: number;
  selectedOptions: SelectedOptions;
  itemTotalPrice: number;
}
