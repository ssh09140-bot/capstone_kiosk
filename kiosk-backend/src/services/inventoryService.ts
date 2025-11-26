import { convertToBaseUnit } from './unitConversionService';

/**
 * 제품의 재고 사용 정보를 기반으로 생산 가능한 수량을 계산합니다.
 * 
 * @param product - inventoryUsages를 포함한 제품 객체
 * @returns 생산 가능한 최대 제품 수량
 */
export function calculateAvailableStock(product: any): number {
    if (!product.inventoryUsages || product.inventoryUsages.length === 0) {
        return 999999; // 재료가 정의되지 않은 경우 사실상 무한 재고로 간주
    }

    let maxPossibleProducts = Infinity;

    for (const usage of product.inventoryUsages) {
        if (!usage.inventory) {
            return 0;
        }
        const availableUnits = usage.inventory.quantity;

        // 재고의 기본 단위로 사용량 변환
        const requiredUnits = convertToBaseUnit(
            usage.usageAmount,
            usage.usageUnit,
            usage.inventory.unit
        );

        if (requiredUnits <= 0) {
            continue; // 0으로 나누기 방지 또는 요구량이 0인 경우 무한 재고
        }

        const possibleProducts = Math.floor(availableUnits / requiredUnits);
        maxPossibleProducts = Math.min(maxPossibleProducts, possibleProducts);
    }

    return maxPossibleProducts;
}
