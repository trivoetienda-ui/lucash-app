/**
 * LuCash $ - Main Application Logic
 * Production Version: Bulletproof Global Scoping
 */

// Supabase Configuration
const SUPABASE_URL = 'https://qbtqubbexeeemqxfowzt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p3OafMM93oZ2J21qP-gdrw_cPsvLLFC';

// Initialize Supabase only if the library is available
const _client = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- GLOBAL NAVIGATION & ACTIONS ---
window.toggleMenu = () => {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (!menu || !overlay) return;
    menu.classList.toggle('open');
    overlay.classList.toggle('active');
};

window.handleNav = async (name) => {
    window.toggleMenu();
    if (window.showSection) await window.showSection(name);
};

window.logout = async () => {
    if (_client) await _client.auth.signOut();
    window.location.reload();
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

// State variables
let currentUser = null;
let storage = {};
let updateUI = () => { };

document.addEventListener('DOMContentLoaded', () => {
    if (!_client) {
        console.error("Supabase not loaded. Check internet connection or CDN.");
        alert("Error de conexión: No se pudo cargar el motor de datos.");
        return;
    }

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // --- AUTHENTICATION LOGIC ---
    const authOverlay = document.getElementById('authOverlay');
    const authForm = document.getElementById('authForm');
    let isSignUpMode = false;

    const updateAuthUI = (user) => {
        currentUser = user;
        if (user) {
            document.body.classList.remove('auth-hidden');
            document.body.classList.add('authenticated');
            updateUI();
        } else {
            document.body.classList.add('auth-hidden');
            document.body.classList.remove('authenticated');
        }
    };

    _client.auth.getSession().then(({ data: { session } }) => {
        updateAuthUI(session?.user ?? null);
    });

    _client.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session?.user ?? null);
    });

    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            const confirmPassword = document.getElementById('authConfirmPassword').value;
            const btn = document.getElementById('authSubmitBtn');

            if (isSignUpMode) {
                const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
                if (!strongRegex.test(password)) {
                    alert('Requisitos: 8+ caracteres, Mayúscula, Minúscula, Número y Símbolo.');
                    return;
                }
                if (password !== confirmPassword) {
                    alert('Las contraseñas no coinciden.');
                    return;
                }
            }

            btn.disabled = true;
            btn.textContent = 'Procesando...';

            try {
                if (isSignUpMode) {
                    const { error } = await _client.auth.signUp({ email, password });
                    if (error) throw error;
                    alert('¡Registro exitoso! Verifica tu correo.');
                } else {
                    const { error } = await _client.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                }
            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = isSignUpMode ? 'Registrarse' : 'Entrar';
            }
        };
    }

    const toggleAuthModeBtn = document.getElementById('toggleAuthMode');
    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.onclick = (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            document.getElementById('confirmPasswordGroup').style.display = isSignUpMode ? 'block' : 'none';
            document.getElementById('pwRequirements').style.visibility = isSignUpMode ? 'visible' : 'hidden';
            document.getElementById('authSubtitle').textContent = isSignUpMode ? 'Crea una cuenta para empezar' : 'Inicia sesión para gestionar tus remesas';
            document.getElementById('authSubmitBtn').textContent = isSignUpMode ? 'Registrarse' : 'Entrar';
            document.getElementById('toggleAuthText').innerHTML = isSignUpMode ? '¿Ya tienes cuenta? <a href="#" id="swMode">Inicia Sesión</a>' : '¿No tienes cuenta? <a href="#" id="swMode">Regístrate gratis</a>';
            document.getElementById('swMode').onclick = toggleAuthModeBtn.onclick;
        };
    }

    window.togglePasswordVisibility = (inputId) => {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // --- STORAGE ---
    storage = {
        getTransactions: async () => {
            const { data } = await _client.from('transactions').select('*').order('date', { ascending: false });
            return data || [];
        },
        saveTransaction: async (tx) => {
            const { error } = await _client.from('transactions').upsert({ ...tx, user_id: currentUser.id });
            if (error) alert('Error: ' + error.message);
            await updateUI();
        },
        deleteTransaction: async (id) => {
            if (!confirm('¿Seguro?')) return;
            await _client.from('transactions').delete().eq('id', id);
            await updateUI();
        },
        toggleLiquidated: async (id, currentState) => {
            await _client.from('transactions').update({ liquidated: !currentState }).eq('id', id);
            await updateUI();
        },
        bulkLiquidate: async (ids) => {
            await _client.from('transactions').update({ liquidated: true }).in('id', ids);
            await updateUI();
        },
        getColabs: async () => {
            const { data } = await _client.from('collaborators').select('*').order('name');
            return data || [];
        },
        saveColab: async (colab) => {
            const { error } = await _client.from('collaborators').upsert({ ...colab, user_id: currentUser.id });
            if (error) alert('Error: ' + error.message);
            await updateUI();
        },
        deleteColab: async (id) => {
            if (!confirm('¿Seguro?')) return;
            await _client.from('collaborators').delete().eq('id', id);
            await updateUI();
        }
    };

    // --- NAVIGATION ---
    const sections = {
        dashboard: document.getElementById('dashboardSection'),
        transactions: document.getElementById('transactionsSection'),
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

        if (name === 'dashboard') await renderDashboard();
        if (name === 'transactions') await renderTransactions();
        if (name === 'collaborators') await renderColabs();
    };

    // --- DASHBOARD & CHARTS ---
    let profitChart = null;

    const renderDashboard = async () => {
        if (!currentUser) return;
        const txs = await storage.getTransactions();
        const colabs = await storage.getColabs();

        const dateFrom = document.getElementById('dashDateFrom').value;
        const dateTo = document.getElementById('dashDateTo').value;

        const filteredTxs = txs.filter(tx => (!dateFrom || tx.date >= dateFrom) && (!dateTo || tx.date <= dateTo));
        const now = new Date();
        const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthlyTxs = txs.filter(tx => tx.date >= firstDayMonth);

        const stats = {
            periodProfit: filteredTxs.reduce((sum, t) => sum + t.ganancia_neta, 0),
            userGainMonth: monthlyTxs.reduce((sum, t) => sum + t.ganancia_usuario, 0),
            totalPending: txs.filter(t => !t.liquidated).reduce((sum, t) => sum + t.ganancia_colaborador, 0),
            volCop: filteredTxs.reduce((sum, t) => sum + (t.type === 'COP_VES' ? t.amount_rec : t.monto_entrego), 0)
        };

        document.getElementById('statPeriodProfit').textContent = `${stats.periodProfit.toFixed(2)} USDT`;
        document.getElementById('statUserGainMonth').textContent = `${stats.userGainMonth.toFixed(2)} USDT`;
        document.getElementById('statTotalPending').textContent = `${stats.totalPending.toFixed(2)} USDT`;
        document.getElementById('statVolCop').textContent = formatCurrency(stats.volCop, 'COP');

        renderColabSummary(txs, colabs);
        renderChart(filteredTxs);
    };

    const renderColabSummary = (txs, colabs) => {
        const tbody = document.querySelector('#colabSummaryTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        colabs.forEach(c => {
            const cTxs = txs.filter(t => t.colabId === c.id);
            const pte = cTxs.filter(t => !t.liquidated).reduce((sum, t) => sum + t.ganancia_colaborador, 0);
            const total = cTxs.reduce((sum, t) => sum + t.ganancia_colaborador, 0);
            if (pte > 0 || total > 0) {
                tbody.innerHTML += `<tr><td>${c.name}</td><td>${cTxs.length}</td><td style="color:var(--secondary); font-weight:700">${pte.toFixed(2)} USDT</td><td>${total.toFixed(2)} USDT</td></tr>`;
            }
        });
    };

    const renderChart = (txs) => {
        const ctx = document.getElementById('profitChart').getContext('2d');
        if (profitChart) profitChart.destroy();
        const grouped = txs.reduce((acc, tx) => { acc[tx.date] = (acc[tx.date] || 0) + tx.ganancia_neta; return acc; }, {});
        const sortedDates = Object.keys(grouped).sort();
        const labels = sortedDates.map(d => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));
        const data = sortedDates.map(d => grouped[d]);

        profitChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Ganancia Diaria (USDT)', data, borderColor: '#10b981', tension: 0.3, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    // --- TRANSACTIONS ---
    const txForm = document.getElementById('txForm');
    window.openTransactionModal = async (id = null) => {
        if (txForm) txForm.reset();
        document.getElementById('txDate').valueAsDate = new Date();
        const colabSelect = document.getElementById('txColab');
        colabSelect.innerHTML = '<option value="">Ninguno</option>';
        const colabs = await storage.getColabs();
        colabs.forEach(c => colabSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        document.getElementById('txBinanceFeeBuy').value = '0.10';
        document.getElementById('txModal').style.display = 'flex';
    };

    if (txForm) {
        txForm.onsubmit = async (e) => {
            e.preventDefault();
            const rawTx = {
                date: document.getElementById('txDate').value,
                client: document.getElementById('txClient').value,
                type: document.getElementById('txType').value,
                rate: parseFloat(document.getElementById('txRate').value),
                amount_rec: parseFloat(document.getElementById('txAmountRec').value),
                usdt_bought: parseFloat(document.getElementById('txUsdtBought').value),
                usdt_sold: parseFloat(document.getElementById('txUsdtSold').value),
                binance_fee_buy: parseFloat(document.getElementById('txBinanceFeeBuy').value) || 0,
                binance_fee_sell: parseFloat(document.getElementById('txBinanceFeeSell').value) || 0,
                colabId: document.getElementById('txColab').value,
                liquidated: false
            };
            const evidenceFiles = document.getElementById('txEvidence').files;
            if (evidenceFiles.length > 0) {
                rawTx.evidence = [];
                for (let file of evidenceFiles) {
                    const reader = new FileReader();
                    const b64 = await new Promise(r => { reader.onload = (e) => r(e.target.result); reader.readAsDataURL(file); });
                    rawTx.evidence.push(b64);
                }
            }
            rawTx.shared = rawTx.colabId !== "";
            const calculated = FinancialLogic.calculateTransaction({
                tipo_cambio: rawTx.type, tasa_cambio: rawTx.rate, monto_recibo: rawTx.amount_rec,
                usdt_comprados: rawTx.usdt_bought, usdt_vendidos: rawTx.usdt_sold,
                binance_fee_buy: rawTx.binance_fee_buy, binance_fee_sell: rawTx.binance_fee_sell,
                ganancia_compartida: rawTx.shared
            });
            await storage.saveTransaction({ ...rawTx, ...calculated });
            window.closeModal('txModal');
        };
    }

    const renderTransactions = async () => {
        if (!currentUser) return;
        const txs = await storage.getTransactions();
        const colabs = await storage.getColabs();
        const tbody = document.querySelector('#transactionsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const filterColab = document.getElementById('filterColab');
        const currentFilterVal = filterColab.value;
        filterColab.innerHTML = '<option value="">Todo</option>';
        colabs.forEach(c => filterColab.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        filterColab.value = currentFilterVal;

        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;
        const colabFilter = filterColab.value;
        const typeFilter = document.getElementById('filterType').value;

        const filtered = txs.filter(tx => {
            return (!dateFrom || tx.date >= dateFrom) && (!dateTo || tx.date <= dateTo) && (!colabFilter || tx.colabId === colabFilter) && (!typeFilter || tx.type === typeFilter);
        });

        filtered.forEach(tx => {
            const colab = colabs.find(c => c.id === tx.colabId);
            tbody.innerHTML += `
                <tr>
                    <td><input type="checkbox" class="tx-checkbox" data-id="${tx.id}"></td>
                    <td>${new Date(tx.date).toLocaleDateString()}</td>
                    <td>${tx.client || ''}</td>
                    <td>${colab ? colab.name : 'N/A'}</td>
                    <td>${tx.type === 'COP_VES' ? '🇨🇴→🇻🇪' : '🇻🇪→🇨🇴'}</td>
                    <td>${tx.rate.toFixed(2)}</td>
                    <td>${formatNumber(tx.amount_rec)}</td>
                    <td>${formatNumber(tx.monto_entrego)}</td>
                    <td>${tx.usdt_bought.toFixed(2)}</td>
                    <td>${tx.precio_compra_usdt.toFixed(2)}</td>
                    <td class="text-primary" style="font-weight:700">${tx.ganancia_usuario.toFixed(2)}</td>
                    <td><span class="status-tag ${tx.liquidated ? 'status-paid' : 'status-pending'}">${tx.liquidated ? 'Liq.' : 'Pte.'}</span></td>
                    <td style="display:flex; gap:5px;">
                        ${(tx.evidence && tx.evidence.length > 0) ? `<button class="nav-btn small" onclick="viewEvidence('${tx.id}')">📷</button>` : ''}
                        <button class="nav-btn small" onclick="toggleLiquidated('${tx.id}', ${tx.liquidated})">${tx.liquidated ? '↩️' : '✅'}</button>
                        <button class="nav-btn small" onclick="storage.deleteTransaction('${tx.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    };

    window.toggleLiquidated = async (id, currentState) => await storage.toggleLiquidated(id, currentState);
    window.liquidateSelected = async () => {
        const ids = Array.from(document.querySelectorAll('.tx-checkbox:checked')).map(cb => cb.dataset.id);
        if (ids.length > 0 && confirm("¿Liquidar seleccionados?")) await storage.bulkLiquidate(ids);
    };

    window.viewEvidence = async (id) => {
        const txs = await storage.getTransactions();
        const tx = txs.find(t => t.id === id);
        if (tx && tx.evidence) {
            const display = document.getElementById('evidenceDisplay');
            display.innerHTML = tx.evidence.map(img => `<img src="${img}" style="max-width:100%; margin-bottom:10px;">`).join('');
            document.getElementById('viewerModal').style.display = 'flex';
        }
    };

    window.openColabModal = async () => {
        const name = prompt("Nombre:");
        if (name) await storage.saveColab({ name });
    };

    const renderColabs = async () => {
        const colabs = await storage.getColabs();
        const txs = await storage.getTransactions();
        const tbody = document.querySelector('#colobsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        colabs.forEach(c => {
            const cTxs = txs.filter(t => t.colabId === c.id);
            tbody.innerHTML += `<tr><td>${c.name}</td><td>${cTxs.length}</td><td>${cTxs.reduce((sum, t) => sum + t.ganancia_colaborador, 0).toFixed(2)} USDT</td><td><button class="nav-btn small" onclick="storage.deleteColab('${c.id}')">🗑️</button></td></tr>`;
        });
    };

    // --- HELPERS ---
    const formatCurrency = (v, c) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);
    const formatNumber = (v) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2 }).format(v);

    updateUI = async () => {
        await renderDashboard();
        await renderTransactions();
        await renderColabs();
    };

    window.exportToExcel = async () => {
        const txs = await storage.getTransactions();
        const ws = XLSX.utils.json_to_sheet(txs);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, "LuCash_Export.xlsx");
    };

    // Initialize
    if (document.getElementById('inputBuy')) {
        const calc = () => {
            const buy = parseFloat(document.getElementById('inputBuy').value);
            const sell = parseFloat(document.getElementById('inputSell').value);
            const profit = parseFloat(document.getElementById('inputProfit').value) / 100;
            if (buy && sell) document.getElementById('resultTasa').value = ((buy * (1 + profit)) / sell).toFixed(2);
        };
        ['inputBuy', 'inputSell', 'inputProfit'].forEach(id => document.getElementById(id).oninput = calc);
    }

    if (document.getElementById('dashDateFrom')) {
        ['dashDateFrom', 'dashDateTo'].forEach(id => document.getElementById(id).onchange = renderDashboard);
    }

    window.showSection('dashboard');
});
