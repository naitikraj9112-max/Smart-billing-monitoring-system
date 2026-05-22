/**
 * calculator.js
 * Electricity Bill Calculation Engine for Smart Bill Monitoring System
 * Calculates costs based on progressive tariff slabs and estimates monthly metrics
 */

/**
 * Calculates the current bill based on cumulative units consumed (kWh)
 * utilizing standard progressive tariff slab rates:
 *   - Slab 1 (0 to 100 units): ₹4.00 per unit
 *   - Slab 2 (101 to 200 units): ₹6.00 per unit
 *   - Slab 3 (200+ units): ₹8.00 per unit
 * 
 * Progressive math example for 250 units:
 *   (100 * 4) + (100 * 6) + (50 * 8) = 400 + 600 + 400 = ₹1400.00
 * 
 * @param {number} units - Cumulative energy units consumed in kWh
 * @returns {number} Slab calculated bill cost in Rupees (₹)
 */
export function calculateBill(units) {
    if (typeof units !== 'number' || isNaN(units) || units <= 0) {
        return 0.00;
    }

    let billAmount = 0.00;

    if (units <= 100) {
        billAmount = units * 4.00;
    } else if (units <= 200) {
        billAmount = (100.00 * 4.00) + ((units - 100.00) * 6.00);
    } else {
        billAmount = (100.00 * 4.00) + (100.00 * 6.00) + ((units - 200.00) * 8.00);
    }

    return billAmount;
}

/**
 * Estimates monthly units consumed (kWh) and calculates estimated monthly cost.
 * Uses instantaneous power draw averaged over telemetry samples to project load.
 * Assumes a 30-day billing cycle (720 hours).
 * 
 * Projection math:
 *   Projected Units (kWh) = (Average Power (W) * 720 hours) / 1000
 * 
 * @param {number} averagePowerWatts - Average active power draw in Watts
 * @returns {Object} Containing projectedUnits (kWh) and estimatedMonthlyBill (₹)
 */
export function estimateMonthlyBill(averagePowerWatts) {
    if (typeof averagePowerWatts !== 'number' || isNaN(averagePowerWatts) || averagePowerWatts <= 0) {
        return {
            projectedUnits: 0.00,
            estimatedMonthlyBill: 0.00
        };
    }

    // Project consumption over a 30-day period (720 hours)
    const projectedUnits = (averagePowerWatts * 720.00) / 1000.00;
    const estimatedBill = calculateBill(projectedUnits);

    return {
        projectedUnits: parseFloat(projectedUnits.toFixed(3)),
        estimatedMonthlyBill: parseFloat(estimatedBill.toFixed(2))
    };
}
