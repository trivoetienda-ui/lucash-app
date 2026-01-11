document.addEventListener('DOMContentLoaded', () => {
    const directionBtns = document.querySelectorAll('.toggle-btn');
    const inputBuy = document.getElementById('inputBuy');
    const inputSell = document.getElementById('inputSell');
    const inputProfit = document.getElementById('inputProfit');
    const resultTasa = document.getElementById('resultTasa');
    const buyLabel = document.getElementById('buyLabel');
    const sellLabel = document.getElementById('sellLabel');
    const errorMessage = document.getElementById('errorMessage');

    let currentDirection = 'COP_VES';

    const updateLabels = () => {
        if (currentDirection === 'COP_VES') {
            buyLabel.textContent = 'Precio Compra (COP)';
            sellLabel.textContent = 'Precio Venta (VES)';
        } else {
            buyLabel.textContent = 'Precio Compra (VES)';
            sellLabel.textContent = 'Precio Venta (COP)';
        }
    };

    const calculate = () => {
        const buy = parseFloat(inputBuy.value);
        const sell = parseFloat(inputSell.value);
        const profitPct = parseFloat(inputProfit.value);

        // Reset error
        errorMessage.style.display = 'none';

        if (isNaN(buy) || isNaN(sell) || isNaN(profitPct)) {
            resultTasa.value = '0.00';
            return;
        }

        if (buy <= 0 || sell <= 0) {
            resultTasa.value = '0.00';
            return;
        }

        const ganancia = profitPct / 100;
        let tasa = 0;

        if (currentDirection === 'COP_VES') {
            // COP → VES: (precio_compra_COP * (1 + ganancia)) / precio_venta_VES
            tasa = (buy * (1 + ganancia)) / sell;
        } else {
            // VES → COP: (precio_venta_COP / precio_compra_VES) * (1 - ganancia)
            tasa = (sell / buy) * (1 - ganancia);
        }

        if (tasa < 0) {
            tasa = 0;
            errorMessage.textContent = 'Resultado negativo no permitido';
            errorMessage.style.display = 'block';
        }

        resultTasa.value = (Math.floor(tasa * 100) / 100).toFixed(2);
    };

    // Event Listeners
    directionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            directionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDirection = btn.dataset.direction;
            updateLabels();
            calculate();
        });
    });

    [inputBuy, inputSell, inputProfit].forEach(input => {
        input.addEventListener('input', calculate);
    });

    // Initial calculation
    calculate();
});
