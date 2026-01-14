/**
 * LuCash $ Financial Logic Engine
 * Handles all precision calculations for remittance operations.
 */

class FinancialLogic {
    static TYPES = {
        COP_VES: 'COP_VES',
        VES_COP: 'VES_COP'
    };

    static BINANCE_FEE = 0.10; // USDT
    static BANK_FEE_PCT = 0.003; // 0.3%

    /**
     * Calculates all fields for a transaction.
     * @param {Object} tx - Input transaction data
     * @returns {Object} Full transaction object with calculated fields
     */
    static calculateTransaction(tx) {
        const result = { ...tx };

        // 1. Amount Delivered (Monto a entregar)
        if (tx.tipo_cambio === this.TYPES.COP_VES) {
            result.monto_entrego = tx.monto_recibo / tx.tasa_cambio;
        } else {
            result.monto_entrego = tx.monto_recibo * tx.tasa_cambio;
        }

        // 2. USDT Buy Price (Precio de compra USDT)
        result.precio_compra_usdt = tx.monto_recibo / tx.usdt_comprados;

        // 3. Bank Fee (Comisión Banco)
        if (tx.tipo_cambio === this.TYPES.COP_VES) {
            result.comision_banco = result.monto_entrego * this.BANK_FEE_PCT;
        } else {
            result.comision_banco = tx.monto_recibo * this.BANK_FEE_PCT;
        }

        // 4. Gross Profit (Ganancia Bruta USDT)
        const fee_buy = tx.binance_fee_buy || 0;
        const fee_sell = tx.binance_fee_sell || 0;
        result.ganancia_bruta = tx.usdt_comprados - tx.usdt_vendidos - fee_buy - fee_sell;

        // 5. Shared Profit Division
        if (tx.ganancia_compartida) {
            const net = result.ganancia_bruta / 2;
            result.ganancia_neta = net;
            result.ganancia_colaborador = net;
            result.ganancia_usuario = net;
        } else {
            result.ganancia_neta = result.ganancia_bruta;
            result.ganancia_colaborador = 0;
            result.ganancia_usuario = result.ganancia_bruta;
        }

        // Precision adjustment (Internal standard: 4 decimals for math, 2 for display)
        this.roundFields(result);

        return result;
    }

    static roundFields(obj) {
        const fields = [
            'monto_entrego', 'precio_compra_usdt', 'comision_banco',
            'ganancia_bruta', 'ganancia_neta', 'ganancia_colaborador', 'ganancia_usuario'
        ];
        fields.forEach(f => {
            if (obj[f] !== undefined) {
                obj[f] = Math.round(obj[f] * 10000) / 10000;
            }
        });
    }
}

if (typeof module !== 'undefined') {
    module.exports = FinancialLogic;
}
