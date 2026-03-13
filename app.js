/**
 * LuCash $ - Main Application Logic (Modular Version)
 * Orchestrates services and handles user interactions.
 */

// Supabase Configuration
const SUPABASE_URL = 'https://qbtqubbexeeemqxfowzt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p3OafMM93oZ2J21qP-gdrw_cPsvLLFC';

// Services instances
let auth, db, ui;
let currentUser = null;

window.toggleMenu = () => {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (menu && overlay) {
        menu.classList.toggle('open');
        overlay.classList.toggle('active');
    }
};

window.handleNav = async (name) => {
    window.toggleMenu();
    if (window.showSection) await window.showSection(name);
};

window.logout = async () => {
    await auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

window.toggleSelectAll = () => {
    const master = document.getElementById('selectAllCheckbox');
    if (!master) return;
    document.querySelectorAll('.tx-checkbox').forEach(cb => cb.checked = master.checked);
};

window.togglePasswordVisibility = (inputId) => {
    const input = document.getElementById(inputId);
    const btn = input.nextElementSibling;
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
};

// --- ACTION MENU HANDLERS ---
window.toggleActionMenu = (btn) => {
    const menu = btn.nextElementSibling;
    const isActive = menu.classList.contains('active');
    document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('active'));
    if (!isActive) {
        menu.classList.add('active');
    }
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) {
        document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('active'));
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const _client = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
    if (!_client) return alert("Error de conexión: Verifica tu internet.");

    // Initialize Services
    auth = new AuthService(_client);
    db = new DBService(_client);
    ui = new RenderService(db);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // --- FILTERS & UTILS ---
    window.applyFilters = () => {
        updateAppUI();
        window.closeModal('filterModal');
    };

    window.resetFilters = () => {
        ['filterDateFrom', 'filterDateTo', 'filterColab', 'filterType', 'filterStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        updateAppUI();
        window.closeModal('filterModal');
    };

    // --- AUTH FLOW ---
    let isUpdating = false;
    const updateAuthUI = async (user) => {
        currentUser = user;
        if (user) {
            document.body.classList.remove('auth-hidden');
            document.body.classList.add('authenticated');
            // updateAppUI is now hoisted as a function declaration
            await updateAppUI();
        } else {
            document.body.classList.add('auth-hidden');
            document.body.classList.remove('authenticated');
        }
    };

    // Initialize dates to "This Month" by default on load
    const initDefaultDates = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const fDate = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const dfInput = document.getElementById('dashDateFrom');
        const dtInput = document.getElementById('dashDateTo');
        if (dfInput && !dfInput.value) dfInput.value = fDate(start);
        if (dtInput && !dtInput.value) dtInput.value = fDate(end);
    };

    initDefaultDates();

    // Listen for auth changes and handle initial session
    auth.onAuthStateChange((_event, session) => {
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
            if (session?.user) {
                updateAuthUI(session.user);
            }
        } else if (_event === 'SIGNED_OUT') {
            updateAuthUI(null);
        }
    });

    // Fallback initial check - Ensure session is caught even if event fires early
    const { data: { session } } = await _client.auth.getSession();
    if (session?.user && !currentUser) {
        updateAuthUI(session.user);
    }

    // Auth Form
    const authForm = document.getElementById('authForm');
    let isSignUpMode = false;
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            const btn = document.getElementById('authSubmitBtn');
            btn.disabled = true;
            btn.textContent = 'Procesando...';

            try {
                if (isSignUpMode) {
                    const confirm = document.getElementById('confirmPasswordGroup').querySelector('input').value;
                    if (password !== confirm) throw new Error('Contraseñas no coinciden.');
                    await auth.signUp(email, password);
                    alert('¡Registro exitoso! Verifica tu correo.');
                } else {
                    await auth.signIn(email, password);
                }
            } catch (err) { alert('Error: ' + err.message); }
            finally { btn.disabled = false; btn.textContent = isSignUpMode ? 'Registrarse' : 'Entrar'; }
        };
    }

    // Toggle Auth Mode
    const toggleBtn = document.getElementById('toggleAuthMode');
    if (toggleBtn) {
        toggleBtn.onclick = (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            document.getElementById('confirmPasswordGroup').style.display = isSignUpMode ? 'block' : 'none';
            document.getElementById('pwRequirements').style.visibility = isSignUpMode ? 'visible' : 'hidden';
            document.getElementById('authSubtitle').textContent = isSignUpMode ? 'Crea una cuenta' : 'Inicia Sesión';
            document.getElementById('authSubmitBtn').textContent = isSignUpMode ? 'Registrarse' : 'Entrar';
            document.getElementById('toggleAuthText').innerHTML = isSignUpMode ? '¿Ya tienes cuenta? <a href="#" id="swMode">Inicia Sesión</a>' : '¿No tienes cuenta? <a href="#" id="swMode">Regístrate</a>';
            document.getElementById('swMode').onclick = toggleBtn.onclick;
        };
    }

    // --- APP UI ENGINE ---
    async function updateAppUI() {
        if (!currentUser || isUpdating) return;
        isUpdating = true;

        try {
            // 1. Dashboard specific filters (Date Range)
            const dashDf = document.getElementById('dashDateFrom')?.value;
            const dashDt = document.getElementById('dashDateTo')?.value;

            // 2. Transaction table filters
            const filters = {
                dateFrom: document.getElementById('filterDateFrom')?.value,
                dateTo: document.getElementById('filterDateTo')?.value,
                colab_id: document.getElementById('filterColab')?.value,
                type: document.getElementById('filterType')?.value,
                status: document.getElementById('filterStatus')?.value
            };

            // Fetch data optimized
            const [txs, colabs, settlements, stats, colabSummary, chartTxs] = await Promise.all([
                db.getTransactions(filters),
                db.getColaboradores(),
                db.getSettlements(),
                db.getDashboardStats(dashDf, dashDt),
                db.getColabSummary(dashDf, dashDt),
                db.getTransactions({ dateFrom: dashDf, dateTo: dashDt })
            ]);

            await ui.renderDashboard(stats, colabSummary, chartTxs);
            ui.renderTransactionsTable(txs, colabs, filters);
            ui.renderColabsTable(colabs, txs);
            ui.renderSettlementsTable(settlements);

            // Populate colab selects in modals
            const selects = [document.getElementById('txColab'), document.getElementById('filterColab')];
            selects.forEach(sel => {
                if (sel) {
                    const currentVal = sel.value;
                    sel.innerHTML = `<option value="">${sel.id === 'filterColab' ? 'Todo' : 'Ninguno'}</option>`;
                    colabs.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.name}</option>`);
                    sel.value = currentVal;
                }
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) {
            console.error("Error updating UI:", err);
        } finally {
            isUpdating = false;
        }
    }

    const sections = {
        dashboard: document.getElementById('dashboardSection'),
        transactions: document.getElementById('transactionsSection'),
        settlements: document.getElementById('settlementsSection'),
        calculator: document.getElementById('calculatorSection'),
        generator: document.getElementById('generatorSection'),
        collaborators: document.getElementById('collaboratorsSection')
    };

    window.showSection = async (name) => {
        Object.keys(sections).forEach(s => { if (sections[s]) sections[s].style.display = 'none'; });
        if (sections[name]) sections[name].style.display = 'block';
        document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(document.querySelectorAll('.menu-item')).find(b => b.getAttribute('onclick')?.includes(name));
        if (activeBtn) activeBtn.classList.add('active');
        await updateAppUI();
    };

    // --- TRANSACTION ACTIONS ---
    window.openTransactionModal = () => {
        document.getElementById('txForm').reset();
        const now = new Date();
        document.getElementById('txDate').value = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        document.getElementById('txModal').style.display = 'flex';
    };

    const txForm = document.getElementById('txForm');
    if (txForm) {
        txForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = txForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = "Procesando...";
            try {
                const colabId = document.getElementById('txColab').value || null;
                const fileInput = document.getElementById('txEvidence');
                let evidence = [];
                if (fileInput?.files.length) {
                    for (let f of fileInput.files) {
                        const path = `evidence/${currentUser.id}/${Date.now()}_${f.name}`;
                        const publicUrl = await db.uploadFile('evidences', path, f);
                        evidence.push(publicUrl);
                    }
                }

                const calcInput = {
                    tipo_cambio: document.getElementById('txType').value,
                    tasa_cambio: parseFloat(document.getElementById('txRate').value) || 0,
                    monto_recibo: parseFloat(document.getElementById('txAmountRec').value) || 0,
                    usdt_comprados: parseFloat(document.getElementById('txUsdtBought').value) || 0,
                    usdt_vendidos: parseFloat(document.getElementById('txUsdtSold').value) || 0,
                    binance_fee_buy: parseFloat(document.getElementById('txBinanceFeeBuy').value) || 0,
                    binance_fee_sell: parseFloat(document.getElementById('txBinanceFeeSell').value) || 0,
                    ganancia_compartida: !!colabId
                };

                const res = FinancialLogic.calculateTransaction(calcInput);
                const finalTx = {
                    date: document.getElementById('txDate').value,
                    client: document.getElementById('txClient').value,
                    colab_id: colabId,
                    type: calcInput.tipo_cambio,
                    rate: calcInput.tasa_cambio,
                    amount_rec: calcInput.monto_recibo,
                    monto_entrego: res.monto_entrego,
                    usdt_bought: calcInput.usdt_comprados,
                    usdt_sold: calcInput.usdt_vendidos,
                    binance_fee_buy: calcInput.binance_fee_buy,
                    binance_fee_sell: calcInput.binance_fee_sell,
                    precio_compra_usdt: res.precio_compra_usdt,
                    comision_banco: res.comision_banco,
                    ganancia_bruta: res.ganancia_bruta,
                    ganancia_neta: res.ganancia_neta,
                    ganancia_usuario: res.ganancia_usuario,
                    ganancia_colaborador: res.ganancia_colaborador,
                    liquidated: false,
                    evidence: evidence
                };

                await db.saveTransaction(finalTx, currentUser.id);
                window.closeModal('txModal');
                updateAppUI();
            } catch (err) { alert("Error: " + err.message); }
            finally { btn.disabled = false; btn.textContent = "Guardar"; }
        };
    }

    window.toggleLiquidated = async (id, s) => { await db.toggleLiquidated(id, s); updateAppUI(); };
    window.deleteTransaction = async (id) => { if (confirm('¿Borrar?')) { await db.deleteTransaction(id); updateAppUI(); } };
    window.liquidateSelected = async () => {
        const ids = Array.from(document.querySelectorAll('.tx-checkbox:checked')).map(cb => cb.dataset.id);
        if (!ids.length) return;

        if (confirm(`¿Liquidar ${ids.length} operaciones seleccionadas?`)) {
            try {
                const txs = await db.getTransactions();
                const colabs = await db.getColaboradores();
                const selectedTxs = txs.filter(t => ids.includes(t.id));

                const colabId = selectedTxs[0].colab_id;
                const colab = colabs.find(c => c.id === colabId);
                const colabName = colab ? colab.name : 'Varios/Ninguno';

                let receiptImage = null;
                if (confirm(`¿Deseas generar el comprobante de liquidación para ${colabName}?`)) {
                    receiptImage = await ui.generateSettlementReceipt(colabName, selectedTxs);
                }

                // Save settlement data if receipt was generated or if you want it tracked
                const totalAmount = selectedTxs.reduce((s, t) => s + Number(t.ganancia_colaborador || 0), 0);
                await db.saveSettlement({
                    colab_id: colabId,
                    colab_name: colabName,
                    total_amount: totalAmount,
                    receipt_image: receiptImage,
                    tx_ids: ids
                }, currentUser.id);

                await db.bulkLiquidate(ids);
                updateAppUI();
            } catch (err) {
                alert("Error al liquidar: " + err.message);
            }
        }
    };
    window.deleteColab = async (id) => { if (confirm('¿Borrar?')) { await db.deleteColaborador(id); updateAppUI(); } };
    window.openColabModal = async () => { const n = prompt("Nombre:"); if (n) { await db.saveColaborador({ name: n }, currentUser.id); updateAppUI(); } };

    window.viewEvidence = async (id) => {
        const txs = await db.getTransactions();
        const tx = txs.find(t => t.id === id);
        if (tx?.evidence?.length) {
            document.getElementById('evidenceDisplay').innerHTML = tx.evidence.map(img => `<img src="${img}" style="max-width:100%; border-radius:10px; margin-bottom:15px;">`).join('');
            document.getElementById('viewerModal').style.display = 'flex';
        }
    };

    window.viewSettlement = async (id) => {
        const settlements = await db.getSettlements();
        const s = settlements.find(it => it.id === id);
        if (s && s.receipt_image) {
            document.getElementById('evidenceDisplay').innerHTML = `<img src="${s.receipt_image}" style="max-width:100%; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.3);">`;
            document.getElementById('viewerModal').style.display = 'flex';
        } else {
            alert("Este registro no tiene una imagen guardada.");
        }
    };

    window.downloadSettlement = async (id) => {
        const settlements = await db.getSettlements();
        const s = settlements.find(it => it.id === id);
        if (s && s.receipt_image) {
            try {
                const response = await fetch(s.receipt_image);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Soporte_${s.colab_name || 'Lucash'}_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (err) {
                console.error("Error al descargar:", err);
                window.open(s.receipt_image, '_blank');
            }
        } else {
            alert("No hay imagen disponible para descargar.");
        }
    };

    window.deleteSettlement = async (id) => {
        if (confirm('¿Borrar esta liquidación del historial? (Solo borra el registro, no afecta las transacciones)')) {
            await db.deleteSettlement(id);
            updateAppUI();
        }
    };

    window.exportToExcel = async () => {
        const txs = await db.getTransactions();
        const ws = XLSX.utils.json_to_sheet(txs);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, "LuCash_Export.xlsx");
    };

    // --- CALCULATOR ---
    if (document.getElementById('directionToggle')) {
        let dir = 'COP_VES';
        const btns = document.querySelectorAll('#directionToggle .toggle-btn');
        const calc = () => {
            const b = parseFloat(document.getElementById('inputBuy').value) || 0;
            const s = parseFloat(document.getElementById('inputSell').value) || 0;
            const p = (parseFloat(document.getElementById('inputProfit').value) || 0) / 100;
            if (b && s) {
                const res = (dir === 'COP_VES') ? (b * (1 + p)) / s : (s / b) * (1 - p);
                document.getElementById('resultTasa').value = res.toFixed(2);
            }
        };

        btns.forEach(btn => btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            dir = btn.dataset.direction;
            document.getElementById('buyLabel').textContent = dir === 'COP_VES' ? 'Precio Compra (COP)' : 'Precio Compra (VES)';
            document.getElementById('sellLabel').textContent = dir === 'COP_VES' ? 'Precio Venta (VES)' : 'Precio Venta (COP)';
            calc();
        });
        ['inputBuy', 'inputSell', 'inputProfit'].forEach(id => document.getElementById(id).oninput = calc);

        // --- BINANCE AUTOFILL ---
        async function fetchBinanceP2P(fiat, tradeType, transAmount, payTypes) {
            const binancePayload = {
                fiat: fiat,
                page: 1,
                rows: 10,
                tradeType: tradeType,
                asset: 'USDT',
                countries: [],
                payTypes: payTypes,
                publisherType: 'merchant'
            };
            if (transAmount) binancePayload.transAmount = transAmount;

            // 1. INTENTO PRIMARIO: Usar el Proxy Privado de Vercel (Rápido y Seguro)
            try {
                const vercelApiUrl = '/api/binance-proxy';
                const response = await fetch(vercelApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(binancePayload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result && result.data && result.data.length > 0 && result.data[0].adv && result.data[0].adv.price) {
                        return parseFloat(result.data[0].adv.price);
                    }
                }
            } catch (e) {
                console.warn("Vercel Proxy no disponible, intentando fallbacks públicos...");
            }

            // 2. FALLBACK: Proxies Públicos (Para GitHub Pages o si falla Vercel)
            const binanceUrl = `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search?t=${Date.now()}`;
            const proxies = [
                (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
                (url) => 'https://api.cors.lol/?url=' + encodeURIComponent(url),
                (url) => 'https://proxy.cors.sh/' + url
            ];

            let lastError = null;
            for (const getProxyUrl of proxies) {
                try {
                    const url = getProxyUrl(binanceUrl);
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-cors-gratis': 'true' 
                        },
                        body: JSON.stringify(binancePayload)
                    });

                    if (!response.ok) continue;

                    const result = await response.json();
                    if (result && result.data && result.data.length > 0 && result.data[0].adv && result.data[0].adv.price) {
                        return parseFloat(result.data[0].adv.price);
                    }
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }
            
            throw lastError || new Error("No se pudo obtener respuesta de ningún método.");
        }

        const autoFillBtn = document.getElementById('autoFillBinanceBtn');
        if (autoFillBtn) {
            autoFillBtn.onclick = async () => {
                const origText = autoFillBtn.innerHTML;
                autoFillBtn.innerHTML = `<i data-lucide="loader" style="width:18px; margin-right:8px; vertical-align:middle;"></i>Consultando...`;
                autoFillBtn.disabled = true;
                if (typeof lucide !== 'undefined') lucide.createIcons();

                try {
                    let buyPrice, sellPrice;

                    if (dir === 'COP_VES') {
                        // 1. Comprar USDT con COP (100.000, Bancolombia) -> User buys, so we search for SELL ads (tradeType BUY in Binance logic for fiat buyer)
                        // Para el botón de "Comprar USD con pesos colombianos", queremos el mejor precio para dar nuestros pesos, esto es tradeType: BUY
                        buyPrice = await fetchBinanceP2P('COP', 'BUY', 100000, ['BancolombiaSA']);

                        // 2. Vender USDT por VES (1.000, Transferencia Bancaria = 'BANK') -> User sells, so we search for BUY ads
                        sellPrice = await fetchBinanceP2P('VES', 'SELL', 1000, ['BANK']);
                    } else { // VES_COP
                        // 1. Comprar USDT con VES (1.000, PagoMovil)
                        buyPrice = await fetchBinanceP2P('VES', 'BUY', 1000, ['PagoMovil']);

                        // 2. Vender USDT por COP (100.000, Bancolombia)
                        sellPrice = await fetchBinanceP2P('COP', 'SELL', 100000, ['BancolombiaSA']);
                    }

                    if (buyPrice && sellPrice) {
                        document.getElementById('inputBuy').value = buyPrice.toFixed(2);
                        document.getElementById('inputSell').value = sellPrice.toFixed(2);
                        calc(); // Disparar el recálculo
                    } else {
                        alert('Binance devolvió una respuesta vacía usando estos filtros (es posible que no haya anuncios activos precisos o Binance fue muy estricto con la conexión).');
                    }
                } catch (e) {
                    alert('Error proxy/CORS al obtener datos de Binance. Para que la consulta funcione correctamente desde el Frontend, instala y activa en tu navegador una extensión como "Allow CORS: Access-Control-Allow-Origin" o revisa tus políticas locales. Detalle: ' + e.message);
                } finally {
                    autoFillBtn.innerHTML = origText;
                    autoFillBtn.disabled = false;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            };
        }
    }

    // --- IMAGE GENERATOR ---
    window.generateImage = async () => {
        const r1 = parseFloat(document.getElementById('genRateCopVes').value);
        const r2 = parseFloat(document.getElementById('genRateVesCop').value);
        if (!r1 || !r2) return alert("Ingresa tasas.");

        document.getElementById('displayRateCopVes').textContent = r1.toFixed(2);
        document.getElementById('displayRateVesCop').textContent = r2.toFixed(2);
        document.getElementById('noteRateVesCop').textContent = (r2 + 1).toFixed(2);

        const tiers1 = [25000, 40000, 50000, 100000, 200000, 500000, 1000000, 2000000];
        document.querySelector('#tableCopVes tbody').innerHTML = tiers1.map(amt => `<tr><td>$ ${new Intl.NumberFormat('es-CO').format(amt)}</td><td>${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt / r1)}</td></tr>`).join('');

        const tiers2 = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
        document.querySelector('#tableVesCop tbody').innerHTML = tiers2.map(amt => `<tr><td>$ ${new Intl.NumberFormat('es-CO').format(amt)}</td><td>${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt * (amt >= 20000 ? r2 + 1 : r2))}</td></tr>`).join('');

        const container = document.getElementById('captureContainer');
        const canvas = await html2canvas(container, { scale: 1, backgroundColor: "#042421" });
        const link = document.createElement('a');
        link.download = `LuCash_Tasas_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    // --- DASHBOARD DATE PRESETS ---
    const dashDatePreset = document.getElementById('dashDatePreset');
    const dashDatePresetBtn = document.getElementById('dashDatePresetBtn');
    const dashDateDropdown = document.getElementById('dashDateDropdown');
    const dashDateFrom = document.getElementById('dashDateFrom');
    const dashDateTo = document.getElementById('dashDateTo');
    const customDateRange = document.getElementById('customDateRange');

    if (dashDatePreset) {
        dashDatePreset.addEventListener('change', (e) => {
            const val = e.target.value;

            // Open modal if "Personalizado" is selected
            if (val === '') {
                document.getElementById('dashDateModal').style.display = 'flex';
                document.getElementById('dashDateFrom').focus();
            }

            const now = new Date();
            const formatDate = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            let fromDate = null;
            let toDate = null;

            if (val === 'today') {
                fromDate = now;
                toDate = now;
            } else if (val === 'yesterday') {
                const y = new Date(now);
                y.setDate(now.getDate() - 1);
                fromDate = y;
                toDate = y;
            } else if (val === '7days') {
                const l7 = new Date(now);
                l7.setDate(now.getDate() - 6);
                fromDate = l7;
                toDate = now;
            } else if (val === '15days') {
                const l15 = new Date(now);
                l15.setDate(now.getDate() - 14);
                fromDate = l15;
                toDate = now;
            } else if (val === '30days') {
                const l30 = new Date(now);
                l30.setDate(now.getDate() - 29);
                fromDate = l30;
                toDate = now;
            } else if (val === 'thisMonth') {
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else if (val === 'lastMonth') {
                fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                toDate = new Date(now.getFullYear(), now.getMonth(), 0);
            } else if (val === 'max') {
                dashDateFrom.value = '';
                dashDateTo.value = '';
                updateAppUI();
                return;
            } else if (val === '') {
                // If "Personalizado" is manually selected again, we don't automatically 
                // re-run filters until they actually change the date inputs.
                return;
            } else {
                return;
            }

            if (fromDate && toDate) {
                dashDateFrom.value = formatDate(fromDate);
                dashDateTo.value = formatDate(toDate);
                updateAppUI();
            }
        });

        // Setup custom dropdown logic
        if (dashDatePresetBtn && dashDateDropdown) {
            dashDatePresetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dashDateDropdown.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                if (dashDateDropdown.classList.contains('show')) {
                    dashDateDropdown.classList.remove('show');
                }
            });

            dashDateDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = item.getAttribute('data-value');

                    // Update dropdown UI
                    dashDateDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    dashDatePresetBtn.querySelector('span').textContent = item.textContent;
                    dashDateDropdown.classList.remove('show');

                    // Sync with hidden select
                    if (dashDatePreset.value !== val) {
                        dashDatePreset.value = val;
                        dashDatePreset.dispatchEvent(new Event('change'));
                    }
                });
            });
        }

        window.applyDashCustomDates = () => {
            if (dashDateFrom.value && dashDateTo.value) {
                updateAppUI();
                closeModal('dashDateModal');
            } else {
                alert("Por favor selecciona ambas fechas.");
            }
        };

        // Initialize default preselected value on load
        dashDatePreset.dispatchEvent(new Event('change'));
    }

    document.querySelectorAll('#dashDateFrom, #dashDateTo').forEach(el => el.addEventListener('change', () => {
        if (dashDatePreset) {
            dashDatePreset.value = '';
            if (dashDateDropdown && dashDatePresetBtn) {
                dashDateDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                const customItem = dashDateDropdown.querySelector('.dropdown-item[data-value=""]');
                if (customItem) customItem.classList.add('active');
                dashDatePresetBtn.querySelector('span').textContent = 'Personalizado';
            }
        }
        updateAppUI();
    }));

    window.toggleExpandChart = () => {
        const card = document.getElementById('chartCard');
        const btn = document.getElementById('expandChartBtn');

        let placeholder = document.getElementById('chartPlaceholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = 'chartPlaceholder';
            placeholder.style.display = 'none';
        }

        const isExpanding = !card.classList.contains('chart-expanded-mode');

        if (isExpanding) {
            card.parentNode.insertBefore(placeholder, card);
            document.body.appendChild(card);
            card.classList.add('chart-expanded-mode');
            btn.innerHTML = `<i data-lucide="minimize-2" style="width: 16px; height: 16px;"></i>`;
            document.body.style.overflow = 'hidden';
        } else {
            placeholder.parentNode.insertBefore(card, placeholder);
            placeholder.remove();
            card.classList.remove('chart-expanded-mode');
            btn.innerHTML = `<i data-lucide="maximize-2" style="width: 16px; height: 16px;"></i>`;
            document.body.style.overflow = 'auto';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        setTimeout(() => {
            if (ui && ui.chart) ui.chart.resize();
            window.dispatchEvent(new Event('resize'));
        }, 150);
    };

    window.showSection('dashboard');
});
