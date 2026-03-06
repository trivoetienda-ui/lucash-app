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

        // Ensure all numeric inputs are treated as numbers
        const monto_recibo = Number(tx.monto_recibo || 0);
        const tasa_cambio = Number(tx.tasa_cambio || 0);
        const usdt_comprados = Number(tx.usdt_comprados || 0);
        const usdt_vendidos = Number(tx.usdt_vendidos || 0);
        const binance_fee_buy = Number(tx.binance_fee_buy || 0);
        const binance_fee_sell = Number(tx.binance_fee_sell || 0);

        // 1. Amount Delivered (Monto a entregar)
        if (tasa_cambio > 0) {
            if (tx.tipo_cambio === this.TYPES.COP_VES) {
                result.monto_entrego = monto_recibo / tasa_cambio;
            } else {
                result.monto_entrego = monto_recibo * tasa_cambio;
            }
        } else {
            result.monto_entrego = 0;
        }

        // 2. USDT Buy Price (Precio de compra USDT)
        result.precio_compra_usdt = usdt_comprados > 0 ? monto_recibo / usdt_comprados : 0;

        // 3. Bank Fee (Comisión Banco)
        if (tx.tipo_cambio === this.TYPES.COP_VES) {
            result.comision_banco = result.monto_entrego * this.BANK_FEE_PCT;
        } else {
            result.comision_banco = monto_recibo * this.BANK_FEE_PCT;
        }

        // 4. Gross Profit (Ganancia Bruta USDT)
        result.ganancia_bruta = usdt_comprados - usdt_vendidos - binance_fee_buy - binance_fee_sell;

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

        // Precision adjustment
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
