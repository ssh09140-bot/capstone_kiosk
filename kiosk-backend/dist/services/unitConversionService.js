"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToBaseUnit = convertToBaseUnit;
/**
 * A map defining conversion factors from a source unit to a base unit.
 * We define 'kg' and 'L' as our base units for weight and volume.
 */
const conversionFactors = {
    g: { base: 'kg', factor: 0.001 },
    kg: { base: 'kg', factor: 1 },
    ml: { base: 'L', factor: 0.001 },
    l: { base: 'L', factor: 1 },
    L: { base: 'L', factor: 1 },
};
/**
 * Converts a given amount from a source unit to a target base unit.
 *
 * @param amount The numerical value to convert.
 * @param fromUnit The unit of the provided amount (e.g., 'g', 'ml').
 * @param toUnit The target base unit (e.g., 'kg', 'L').
 * @returns The converted amount in the target base unit.
 */
function convertToBaseUnit(amount, fromUnit, toUnit) {
    // If fromUnit is not specified or is the same as toUnit, no conversion needed.
    if (!fromUnit || fromUnit.toLowerCase() === toUnit.toLowerCase()) {
        return amount;
    }
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();
    const conversion = conversionFactors[from];
    // Check if a conversion is defined and if it matches the target base unit.
    if (conversion && conversion.base.toLowerCase() === to) {
        return amount * conversion.factor;
    }
    // If no conversion rule is found (e.g., for 'pcs' or mismatched units like 'g' to 'L'),
    // return the original amount. This assumes a 1:1 conversion for pieces or that the
    // units are effectively the same if not explicitly convertible.
    console.warn(`No conversion rule found for '${fromUnit}' to '${toUnit}'. Returning original amount.`);
    return amount;
}
