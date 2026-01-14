/**
 * LuCash $ - Main Application Logic
 * Production Version: Bulletproof Global Scoping
 */

// Supabase Configuration
const SUPABASE_URL = 'https://qbtqubbexeeemqxfowzt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p3OafMM93oZ2J21qP-gdrw_cPsvLLFC';

// Initialize Supabase only if the library is available
const _client = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- GLOBAL NAVIGATION & ACTIONS (ROOT LEVEL FOR HTML ONCLICK) ---
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
    if (_client) {
        await _client.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
    }
    window.location.reload();
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

window.toggleSelectAll = () => {
    const master = document.getElementById('selectAllCheckbox');
    if (!master) return;
    const cbs = document.querySelectorAll('.tx-checkbox');
    cbs.forEach(cb => cb.checked = master.checked);
};

// State variables
let currentUser = null;
let storage = {};
let updateUI = () => { };

document.addEventListener('DOMContentLoaded', () => {
    if (!_client) {
        alert("Error de conexión: Verifica tu internet.");
        return;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // --- AUTHENTICATION LOGIC ---
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

    _client.auth.getSession().then(({ data: { session } }) => updateAuthUI(session?.user ?? null));
    _client.auth.onAuthStateChange((_event, session) => updateAuthUI(session?.user ?? null));

    const authForm = document.getElementById('authForm');
    let isSignUpMode = false;

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
            } catch (err) { alert('Error: ' + err.message); } finally {
                btn.disabled = false;
                btn.textContent = isSignUpMode ? 'Registrarse' : 'Entrar';
            }
        };
    }

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

    window.togglePasswordVisibility = (inputId) => {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.setAttribute('data-lucide', input.type === 'password' ? 'eye' : 'eye-off');
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
            if (error) throw error;
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
        deleteTransaction: async (id) => { if (confirm('¿Seguro?')) { await _client.from('transactions').delete().eq('id', id); await updateUI(); } },
        toggleLiquidated: async (id, s) => { await _client.from('transactions').update({ liquidated: !s }).eq('id', id); await updateUI(); },
        bulkLiquidate: async (ids) => { await _client.from('transactions').update({ liquidated: true }).in('id', ids); await updateUI(); },
        deleteColab: async (id) => { if (confirm('¿Seguro?')) { await _client.from('collaborators').delete().eq('id', id); await updateUI(); } }
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

    // --- DASHBOARD ---
    let profitChart = null;
    const renderDashboard = async () => {
        if (!currentUser) return;
        const txs = await storage.getTransactions();
        const colabs = await storage.getColabs();
        const df = document.getElementById('dashDateFrom').value;
        const dt = document.getElementById('dashDateTo').value;
        const filtered = txs.filter(tx => (!df || tx.date >= df) && (!dt || tx.date <= dt));
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const monthly = txs.filter(tx => tx.date >= firstDay);

        document.getElementById('statPeriodProfit').textContent = `${filtered.reduce((s, t) => s + t.ganancia_neta, 0).toFixed(2)} USDT`;
        document.getElementById('statUserGainMonth').textContent = `${monthly.reduce((s, t) => s + t.ganancia_usuario, 0).toFixed(2)} USDT`;
        document.getElementById('statTotalPending').textContent = `${txs.filter(t => !t.liquidated).reduce((s, t) => s + t.ganancia_colaborador, 0).toFixed(2)} USDT`;

        const vol = filtered.reduce((s, t) => s + (t.type === 'COP_VES' ? t.amount_rec : t.monto_entrego), 0);
        document.getElementById('statVolCop').textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(vol);

        const tbody = document.querySelector('#colabSummaryTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            colabs.forEach(c => {
                const cTxs = txs.filter(t => t.colab_id === c.id);
                const pte = cTxs.filter(t => !t.liquidated).reduce((s, t) => s + t.ganancia_colaborador, 0);
                const tot = cTxs.reduce((s, t) => s + t.ganancia_colaborador, 0);
                if (tot > 0) tbody.innerHTML += `<tr><td>${c.name}</td><td>${cTxs.length}</td><td style="color:var(--secondary); font-weight:700">${pte.toFixed(2)} USDT</td><td>${tot.toFixed(2)} USDT</td></tr>`;
            });
        }
        renderChart(filtered);
    };

    const renderChart = (txs) => {
        const canvas = document.getElementById('profitChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (profitChart) profitChart.destroy();
        const grouped = txs.reduce((acc, tx) => { acc[tx.date] = (acc[tx.date] || 0) + tx.ganancia_neta; return acc; }, {});
        const sorted = Object.keys(grouped).sort();
        profitChart = new Chart(ctx, {
            type: 'line',
            data: { labels: sorted.map(d => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })), datasets: [{ label: 'Ganancia (USDT)', data: sorted.map(d => grouped[d]), borderColor: '#10b981', tension: 0.3, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    // --- TRANSACTIONS ---
    const txForm = document.getElementById('txForm');
    window.openTransactionModal = async () => {
        txForm.reset();
        document.getElementById('txDate').valueAsDate = new Date();
        const sel = document.getElementById('txColab');
        sel.innerHTML = '<option value="">Ninguno</option>';
        (await storage.getColabs()).forEach(c => sel.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        document.getElementById('txModal').style.display = 'flex';
    };

    if (txForm) {
        txForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = txForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                const colabId = document.getElementById('txColab').value || null;
                let evidence = [];
                const files = document.getElementById('txEvidence').files;
                if (files.length > 0) {
                    for (let f of files) {
                        const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(f); });
                        evidence.push(b64);
                    }
                }

                const calcInput = {
                    tipo_cambio: document.getElementById('txType').value,
                    tasa_cambio: parseFloat(document.getElementById('txRate').value),
                    monto_recibo: parseFloat(document.getElementById('txAmountRec').value),
                    usdt_comprados: parseFloat(document.getElementById('txUsdtBought').value),
                    usdt_vendidos: parseFloat(document.getElementById('txUsdtSold').value),
                    binance_fee_buy: parseFloat(document.getElementById('txBinanceFeeBuy').value) || 0,
                    binance_fee_sell: parseFloat(document.getElementById('txBinanceFeeSell').value) || 0,
                    ganancia_compartida: !!colabId
                };

                const results = FinancialLogic.calculateTransaction(calcInput);

                const finalDbTx = {
                    date: document.getElementById('txDate').value,
                    client: document.getElementById('txClient').value,
                    colab_id: colabId,
                    type: calcInput.tipo_cambio,
                    rate: calcInput.tasa_cambio,
                    amount_rec: calcInput.monto_recibo,
                    monto_entrego: results.monto_entrego,
                    usdt_bought: calcInput.usdt_comprados,
                    usdt_sold: calcInput.usdt_vendidos,
                    binance_fee_buy: calcInput.binance_fee_buy,
                    binance_fee_sell: calcInput.binance_fee_sell,
                    precio_compra_usdt: results.precio_compra_usdt,
                    comision_banco: results.comision_banco,
                    ganancia_bruta: results.ganancia_bruta,
                    ganancia_neta: results.ganancia_neta,
                    ganancia_usuario: results.ganancia_usuario,
                    ganancia_colaborador: results.ganancia_colaborador,
                    liquidated: false,
                    evidence: evidence
                };

                await storage.saveTransaction(finalDbTx);
                window.closeModal('txModal');
            } catch (err) {
                alert("Error al guardar: " + err.message);
            } finally {
                btn.disabled = false;
            }
        };
    }

    const renderTransactions = async () => {
        if (!currentUser) return;
        const txs = await storage.getTransactions();
        const colabs = await storage.getColabs();
        const tbody = document.querySelector('#transactionsTable tbody'); if (!tbody) return;
        tbody.innerHTML = '';
        const fColab = document.getElementById('filterColab');
        const curF = fColab.value;
        fColab.innerHTML = '<option value="">Todo</option>';
        colabs.forEach(c => fColab.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        fColab.value = curF;

        const df = document.getElementById('filterDateFrom').value;
        const dt = document.getElementById('filterDateTo').value;
        const tf = document.getElementById('filterType').value;

        txs.filter(tx => (!df || tx.date >= df) && (!dt || tx.date <= dt) && (!curF || tx.colab_id === curF) && (!tf || tx.type === tf)).forEach(tx => {
            const c = colabs.find(cl => cl.id === tx.colab_id);
            tbody.innerHTML += `<tr>
                <td><input type="checkbox" class="tx-checkbox" data-id="${tx.id}"></td>
                <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td>${tx.client || ''}</td>
                <td>${c ? c.name : 'N/A'}</td>
                <td>${tx.type === 'COP_VES' ? '🇨🇴→🇻🇪' : '🇻🇪→🇨🇴'}</td>
                <td>${Number(tx.rate).toFixed(2)}</td>
                <td>${new Intl.NumberFormat('es-CO').format(tx.amount_rec)}</td>
                <td>${new Intl.NumberFormat('es-CO').format(tx.monto_entrego)}</td>
                <td>${Number(tx.usdt_bought).toFixed(2)}</td>
                <td>${Number(tx.usdt_sold).toFixed(2)}</td>
                <td>${Number(tx.precio_compra_usdt).toFixed(2)}</td>
                <td>${Number(tx.binance_fee_buy).toFixed(2)}</td>
                <td>${Number(tx.binance_fee_sell).toFixed(2)}</td>
                <td>${new Intl.NumberFormat('es-CO').format(tx.comision_banco)}</td>
                <td>${Number(tx.ganancia_bruta).toFixed(2)}</td>
                <td class="text-primary" style="font-weight:700">${Number(tx.ganancia_usuario).toFixed(2)}</td>
                <td>${Number(tx.ganancia_colaborador).toFixed(2)}</td>
                <td><span class="status-tag ${tx.liquidated ? 'status-paid' : 'status-pending'}">${tx.liquidated ? 'Liq.' : 'Pte.'}</span></td>
                <td style="display:flex; gap:5px;">
                    ${(tx.evidence && tx.evidence.length > 0) ? `<button class="nav-btn small" onclick="viewEvidence('${tx.id}')">📷</button>` : ''}
                    <button class="nav-btn small" onclick="toggleLiquidated('${tx.id}', ${tx.liquidated})">${tx.liquidated ? '↩️' : '✅'}</button>
                    <button class="nav-btn small" onclick="deleteTransaction('${tx.id}')">🗑️</button>
                </td>
            </tr>`;
        });
    };

    window.toggleLiquidated = (id, s) => storage.toggleLiquidated(id, s);
    window.deleteTransaction = (id) => storage.deleteTransaction(id);
    window.liquidateSelected = async () => {
        const ids = Array.from(document.querySelectorAll('.tx-checkbox:checked')).map(cb => cb.dataset.id);
        if (ids.length > 0 && confirm("¿Liquidar?")) await storage.bulkLiquidate(ids);
    };

    window.viewEvidence = async (id) => {
        const tx = (await storage.getTransactions()).find(t => t.id === id);
        if (tx && tx.evidence) {
            document.getElementById('evidenceDisplay').innerHTML = tx.evidence.map(img => `<img src="${img}" style="max-width:100%; margin-bottom:10px;">`).join('');
            document.getElementById('viewerModal').style.display = 'flex';
        }
    };

    window.openColabModal = async () => { const n = prompt("Nombre:"); if (n) await storage.saveColab({ name: n }); };
    const renderColabs = async () => {
        const colabs = await storage.getColabs();
        const txs = await storage.getTransactions();
        const tbody = document.querySelector('#colabTable tbody'); if (!tbody) return;
        tbody.innerHTML = colabs.map(c => {
            const cTxs = txs.filter(t => t.colab_id === c.id);
            return `<tr><td>${c.name}</td><td>${cTxs.length}</td><td>${cTxs.reduce((s, t) => s + t.ganancia_colaborador, 0).toFixed(2)} USDT</td><td><button class="nav-btn small" onclick="deleteColab('${c.id}')">🗑️</button></td></tr>`;
        }).join('');
    };
    window.deleteColab = (id) => storage.deleteColab(id);

    // --- INIT ---
    updateUI = async () => { await renderDashboard(); await renderTransactions(); await renderColabs(); };
    window.exportToExcel = async () => { const txs = await storage.getTransactions(); const ws = XLSX.utils.json_to_sheet(txs); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, "LuCash_Export.xlsx"); };

    if (document.getElementById('inputBuy')) {
        const calc = () => {
            const b = parseFloat(document.getElementById('inputBuy').value), s = parseFloat(document.getElementById('inputSell').value), p = parseFloat(document.getElementById('inputProfit').value) / 100;
            if (b && s) document.getElementById('resultTasa').value = ((b * (1 + p)) / s).toFixed(2);
        };
        ['inputBuy', 'inputSell', 'inputProfit'].forEach(id => document.getElementById(id).oninput = calc);
    }
    ['dashDateFrom', 'dashDateTo'].forEach(id => document.getElementById(id).onchange = renderDashboard);
    window.showSection('dashboard');
});
