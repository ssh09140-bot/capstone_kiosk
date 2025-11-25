export * from '@prisma/client';
import { Product as PrismaProduct, OptionGroup as PrismaOptionGroup, Option as PrismaOption, Category as PrismaCategory } from '@prisma/client';

export interface OptionGroup extends PrismaOptionGroup {
    options: PrismaOption[];
}

export interface Product extends PrismaProduct {
    category?: PrismaCategory;
    optionGroups?: OptionGroup[];
    imageUrl: string | null;
    availableStock?: number;
}

export interface SelectedOption {
    optionId: number;
    optionName: string;
    price: number;
}

export interface SelectedOptions {
    [key: number]: SelectedOption;
}

export interface CartItem {
    id: string;
    product: Product;
    quantity: number;
    selectedOptions: SelectedOptions;
    itemTotalPrice: number;
}
