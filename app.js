// Global functions for HTML access
let showSection;
let generateImage;

document.addEventListener('DOMContentLoaded', () => {
    // --- CALCULATOR LOGIC ---
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

        if (errorMessage) errorMessage.style.display = 'none';

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
            tasa = (buy * (1 + ganancia)) / sell;
        } else {
            tasa = (sell / buy) * (1 - ganancia);
        }

        if (tasa < 0) {
            tasa = 0;
            if (errorMessage) {
                errorMessage.textContent = 'Resultado negativo no permitido';
                errorMessage.style.display = 'block';
            }
        }

        resultTasa.value = (Math.floor(tasa * 100) / 100).toFixed(2);
    };

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
        if (input) input.addEventListener('input', calculate);
    });

    calculate();

    // --- NAVIGATION LOGIC ---
    const calcSection = document.getElementById('calculatorSection');
    const genSection = document.getElementById('generatorSection');
    const navBtns = document.querySelectorAll('.nav-btn');

    showSection = (sectionName) => {
        navBtns.forEach(btn => btn.classList.remove('active'));
        if (sectionName === 'calculator') {
            calcSection.style.display = 'block';
            genSection.style.display = 'none';
            navBtns[0].classList.add('active');
        } else {
            calcSection.style.display = 'none';
            genSection.style.display = 'block';
            navBtns[1].classList.add('active');
        }
    };

    // --- GENERATOR LOGIC ---
    const formatCurrency = (val, currency) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatNumber = (val) => {
        return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    generateImage = () => {
        const rateCopVes = parseFloat(document.getElementById('genRateCopVes').value);
        const rateVesCop = parseFloat(document.getElementById('genRateVesCop').value);

        if (!rateCopVes || !rateVesCop) {
            alert("Por favor ingresa ambas tasas base");
            return;
        }

        // Fill Data
        document.getElementById('displayRateCopVes').textContent = rateCopVes.toFixed(2);
        document.getElementById('displayRateVesCop').textContent = rateVesCop.toFixed(2);
        document.getElementById('noteRateCopVes').textContent = (rateCopVes - 1).toFixed(2);
        document.getElementById('noteRateVesCop').textContent = (rateVesCop + 1).toFixed(2);

        // Generate Tables
        const tbodyCopVes = document.querySelector('#tableCopVes tbody');
        const tbodyVesCop = document.querySelector('#tableVesCop tbody');
        tbodyCopVes.innerHTML = '';
        tbodyVesCop.innerHTML = '';

        // COP -> VES Steps
        const stepsCop = [25000, 40000, 50000, 100000, 200000, 500000, 1000000, 2000000];
        stepsCop.forEach(amount => {
            let activeRate = rateCopVes;
            if (amount >= 1000000) activeRate = rateCopVes - 1;

            const result = amount / activeRate;

            const row = `<tr>
                <td>${formatCurrency(amount, 'COP')}</td>
                <td>${formatNumber(result)}</td>
            </tr>`;
            tbodyCopVes.innerHTML += row;
        });

        // VES -> COP Steps
        const stepsVes = [300, 400, 500, 1000, 2000, 5000, 10000];
        stepsVes.forEach(amount => {
            let activeRate = rateVesCop;
            if (amount >= 5000) activeRate = rateVesCop + 1;

            const result = amount * activeRate;

            const row = `<tr>
                <td>${formatNumber(amount)}</td>
                <td>${formatCurrency(result, 'COP')}</td>
            </tr>`;
            tbodyVesCop.innerHTML += row;
        });

        // Capture
        const container = document.getElementById('captureContainer');

        // Ensure images are loaded manually if needed, 
        // but try html2canvas with allowTaint first.

        setTimeout(() => {
            html2canvas(container, {
                scale: 1,
                useCORS: true,
                allowTaint: true, // Allow local images
                logging: false,
                backgroundColor: '#0f172a',
                height: container.scrollHeight,
                windowHeight: container.scrollHeight
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `LuCash_Remesas_${new Date().getTime()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error(err);
                alert("Error al generar imagen");
            });
        }, 500); // Increased timeout to 500ms
    };
});
