/**
 * LuCash $ - Main Application Logic
 * Senior Architect Version: Full-stack Fintech PWA
 */

// --- GLOBAL ACCESS ---
// --- GLOBAL ACCESS ---
let showSection, generateImage, openTransactionModal, closeModal, openColabModal, exportToExcel, toggleSelectAll, liquidateSelected, logout, togglePasswordVisibility, toggleMenu, handleNav;

// Supabase Configuration
// Supabase Configuration
const SUPABASE_URL = 'https://qbtqubbexeeemqxfowzt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p3OafMM93oZ2J21qP-gdrw_cPsvLLFC';
const _client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // --- AUTHENTICATION LOGIC ---
    let currentUser = null;
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

    // Check current session
    _client.auth.getSession().then(({ data: { session } }) => {
        updateAuthUI(session?.user ?? null);
    });

    // Listen for auth changes
    _client.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session?.user ?? null);
    });

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const confirmPassword = document.getElementById('authConfirmPassword').value;
        const btn = document.getElementById('authSubmitBtn');

        if (isSignUpMode) {
            // Validation: at least 8 chars, 1 upper, 1 lower, 1 number, 1 symbol
            const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
            if (!strongRegex.test(password)) {
                alert('La contraseña no cumple con los requisitos de seguridad.\n\n- Mínimo 8 caracteres\n- Una mayúscula\n- Una minúscula\n- Un número\n- Un símbolo (!@#$%^&*)');
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
                alert('¡Registro exitoso! Por favor verifica tu correo o intenta iniciar sesión.');
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

    document.getElementById('toggleAuthMode').onclick = (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;

        const confirmGroup = document.getElementById('confirmPasswordGroup');
        const pwReqs = document.getElementById('pwRequirements');

        confirmGroup.style.display = isSignUpMode ? 'block' : 'none';
        pwReqs.style.visibility = isSignUpMode ? 'visible' : 'hidden'; // Ensure info icon is prioritized in signup

        document.getElementById('authSubtitle').textContent = isSignUpMode ? 'Crea una cuenta para empezar' : 'Inicia sesión para gestionar tus remesas';
        document.getElementById('authSubmitBtn').textContent = isSignUpMode ? 'Registrarse' : 'Entrar';

        const toggleText = document.getElementById('toggleAuthText');
        toggleText.innerHTML = isSignUpMode ? '¿Ya tienes cuenta? <a href="#" id="swMode">Inicia Sesión</a>' : '¿No tienes cuenta? <a href="#" id="swMode">Regístrate gratis</a>';

        document.getElementById('swMode').onclick = document.getElementById('toggleAuthMode').onclick;
    };

    togglePasswordVisibility = (inputId) => {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    };

    window.logout = async () => {
        await _client.auth.signOut();
        window.location.reload(); // Force reload to clear all states
    };

    // --- STORAGE (SUPABASE) ---
    const storage = {
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
        Object.keys(sections).forEach(s => sections[s].style.display = 'none');
        sections[name].style.display = 'block';

        // Update active class in menu
        document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(document.querySelectorAll('.menu-item')).find(b => b.getAttribute('onclick')?.includes(name));
        if (activeBtn) activeBtn.classList.add('active');

        if (name === 'dashboard') await renderDashboard();
        if (name === 'transactions') await renderTransactions();
        if (name === 'collaborators') await renderColabs();
    };

    window.toggleMenu = () => {
        const menu = document.getElementById('sideMenu');
        const overlay = document.getElementById('menuOverlay');
        if (!menu || !overlay) return;
        menu.classList.toggle('open');
        overlay.classList.toggle('active');
    };

    window.handleNav = async (name) => {
        window.toggleMenu(); // Close menu
        await window.showSection(name);
    };

    // --- DASHBOARD & STATS ---
    let profitChart = null;

    const renderDashboard = async () => {
        if (!currentUser) return;
        const txs = await storage.getTransactions();
        const colabs = await storage.getColabs();

        const dateFrom = document.getElementById('dashDateFrom').value;
        const dateTo = document.getElementById('dashDateTo').value;

        // Filter for Stats
        const filteredTxs = txs.filter(tx => {
            const txDate = tx.date;
            return (!dateFrom || txDate >= dateFrom) && (!dateTo || txDate <= dateTo);
        });

        // Filter for Monthly Metric (Current Month)
        const now = new Date();
        const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthlyTxs = txs.filter(tx => tx.date >= firstDayMonth);

        const stats = {
            periodProfit: filteredTxs.reduce((sum, t) => sum + t.ganancia_neta, 0),
            userGainMonth: monthlyTxs.reduce((sum, t) => sum + t.ganancia_usuario, 0),
            totalPending: txs.filter(t => !t.liquidated).reduce((sum, t) => sum + t.ganancia_colaborador, 0),
            volCop: filteredTxs.reduce((sum, t) => {
                return sum + (t.type === 'COP_VES' ? t.amount_rec : t.monto_entrego);
            }, 0)
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
        tbody.innerHTML = '';

        colabs.forEach(c => {
            const cTxs = txs.filter(t => t.colabId === c.id);
            const pte = cTxs.filter(t => !t.liquidated).reduce((sum, t) => sum + t.ganancia_colaborador, 0);
            const total = cTxs.reduce((sum, t) => sum + t.ganancia_colaborador, 0);

            if (pte > 0 || total > 0) {
                tbody.innerHTML += `
                    <tr>
                        <td>${c.name}</td>
                        <td>${cTxs.length}</td>
                        <td style="color:var(--secondary); font-weight:700">${pte.toFixed(2)} USDT</td>
                        <td>${total.toFixed(2)} USDT</td>
                    </tr>
                `;
            }
        });
    };

    const renderChart = (txs) => {
        const ctx = document.getElementById('profitChart').getContext('2d');
        if (profitChart) profitChart.destroy();

        // Goal: Last 15 days or selected period
        // If range is large, group by day. For now, daily profit of filteredTxs.
        const grouped = txs.reduce((acc, tx) => {
            acc[tx.date] = (acc[tx.date] || 0) + tx.ganancia_neta;
            return acc;
        }, {});

        const sortedDates = Object.keys(grouped).sort();
        const labels = sortedDates.map(d => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));
        const data = sortedDates.map(d => grouped[d]);

        // If no data, show empty
        if (sortedDates.length === 0) {
            labels.push('Sin datos');
            data.push(0);
        }

        profitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ganancia Diaria (USDT)',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.5)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(255,255,255,0.5)' }
                    }
                }
            }
        });
    };

    // --- TRANSACTION MANAGEMENT ---
    const txForm = document.getElementById('txForm');

    openTransactionModal = async (id = null) => {
        txForm.reset();
        document.getElementById('txDate').valueAsDate = new Date();

        const colabSelect = document.getElementById('txColab');
        colabSelect.innerHTML = '<option value="">Ninguno</option>';
        const colabs = await storage.getColabs();
        colabs.forEach(c => {
            colabSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        document.getElementById('txEvidence').value = '';
        document.getElementById('txBinanceFeeBuy').value = '0.10';
        document.getElementById('txBinanceFeeSell').value = '0';
        document.getElementById('txModal').style.display = 'flex';
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
            };
        });
    };

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
                const compressed = await compressImage(file);
                rawTx.evidence.push(compressed);
            }
        }

        // Automatic Shared Profit if a collaborator is selected
        rawTx.shared = rawTx.colabId !== "";

        const logicInput = {
            tipo_cambio: rawTx.type,
            tasa_cambio: rawTx.rate,
            monto_recibo: rawTx.amount_rec,
            usdt_comprados: rawTx.usdt_bought,
            usdt_vendidos: rawTx.usdt_sold,
            binance_fee_buy: rawTx.binance_fee_buy,
            binance_fee_sell: rawTx.binance_fee_sell,
            ganancia_compartida: rawTx.shared
        };

        const calculated = FinancialLogic.calculateTransaction(logicInput);
        const finalTx = { ...rawTx, ...calculated };

        await storage.saveTransaction(finalTx);
        closeModal('txModal');
    };

    const renderTransactions = async () => {
        if (!currentUser) return;
        const txs = await storage.getTransactions();
        const colabs = await storage.getColabs();
        const tbody = document.querySelector('#transactionsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Populate Filter Dropdown (if empty)
        const filterColab = document.getElementById('filterColab');
        const currentFilterVal = filterColab.value;
        filterColab.innerHTML = '<option value="">Todo</option>';
        colabs.forEach(c => {
            filterColab.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        filterColab.value = currentFilterVal;

        // Filters State
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;
        const colabFilter = filterColab.value;
        const typeFilter = document.getElementById('filterType').value;

        const filtered = txs.filter(tx => {
            const txDate = tx.date;
            const matchDateFrom = !dateFrom || txDate >= dateFrom;
            const matchDateTo = !dateTo || txDate <= dateTo;
            const matchColab = !colabFilter || tx.colabId === colabFilter;
            const matchType = !typeFilter || tx.type === typeFilter;
            return matchDateFrom && matchDateTo && matchColab && matchType;
        });

        filtered.forEach(tx => {
            const colab = colabs.find(c => c.id === tx.colabId);
            const colabName = colab ? colab.name : 'N/A';

            tbody.innerHTML += `
                <tr>
                    <td><input type="checkbox" class="tx-checkbox" data-id="${tx.id}"></td>
                    <td>${new Date(tx.date).toLocaleDateString()}</td>
                    <td>${tx.client || ''}</td>
                    <td>${colabName}</td>
                    <td>${tx.type === 'COP_VES' ? '🇨🇴→🇻🇪' : '🇻🇪→🇨🇴'}</td>
                    <td>${tx.rate.toFixed(2)}</td>
                    <td>${formatNumber(tx.amount_rec)}</td>
                    <td>${formatNumber(tx.monto_entrego)}</td>
                    <td>${tx.usdt_bought.toFixed(2)}</td>
                    <td>${tx.usdt_sold.toFixed(2)}</td>
                    <td>${tx.precio_compra_usdt.toFixed(2)}</td>
                    <td>${(tx.binance_fee_buy || 0).toFixed(2)}</td>
                    <td>${(tx.binance_fee_sell || 0).toFixed(2)}</td>
                    <td>${tx.comision_banco.toFixed(2)}</td>
                    <td class="text-success">${tx.ganancia_bruta.toFixed(2)}</td>
                    <td class="text-primary" style="font-weight:700">${tx.ganancia_usuario.toFixed(2)}</td>
                    <td>${tx.ganancia_colaborador.toFixed(2)}</td>
                    <td><span class="status-tag ${tx.liquidated ? 'status-paid' : 'status-pending'}">${tx.liquidated ? 'Liq.' : 'Pte.'}</span></td>
                    <td style="display:flex; gap:5px;">
                        ${(tx.evidence && tx.evidence.length > 0) ? `<button class="nav-btn small" onclick="viewEvidence('${tx.id}')" style="background:var(--primary); color:white; font-size:0.65rem; border:none;">VER FOTOS</button>` : ''}
                        <button class="nav-btn small ${tx.liquidated ? '' : 'action-btn'}" onclick="toggleLiquidated('${tx.id}', ${tx.liquidated})" title="Marcar como ${tx.liquidated ? 'pendiente' : 'liquidado'}">
                            ${tx.liquidated ? '↩️' : '✅'}
                        </button>
                        <button class="nav-btn small" onclick="storage.deleteTransaction('${tx.id}')" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        });
    };

    toggleLiquidated = async (id, currentState) => {
        await storage.toggleLiquidated(id, currentState);
    };

    liquidateSelected = async () => {
        const checkboxes = document.querySelectorAll('.tx-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
        if (ids.length === 0) return alert('Seleccione al menos una operación');

        if (confirm(`¿Desea marcar ${ids.length} operaciones como liquidadas?`)) {
            await storage.bulkLiquidate(ids);
            document.getElementById('selectAllCheckbox').checked = false;
        }
    };

    // Attach listeners to filters
    ['filterDateFrom', 'filterDateTo', 'filterType', 'filterColab'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = renderTransactions;
    });

    ['dashDateFrom', 'dashDateTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = renderDashboard;
    });

    window.viewEvidence = async (id) => {
        const txs = await storage.getTransactions();
        const tx = txs.find(t => t.id === id);
        if (tx && tx.evidence && tx.evidence.length > 0) {
            const display = document.getElementById('evidenceDisplay');
            display.innerHTML = '<div style="display:flex; flex-direction:column; gap:20px;"></div>';
            const container = display.querySelector('div');

            tx.evidence.forEach((imgBase64, index) => {
                container.innerHTML += `
                    <div style="text-align:center;">
                        <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:5px;">Evidencia ${index + 1}</p>
                        <img src="${imgBase64}" style="max-width: 100%; border-radius: 10px; border: 1px solid var(--border);">
                    </div>
                `;
            });
            document.getElementById('viewerModal').style.display = 'flex';
        }
    };

    window.toggleLiquidated = (id) => storage.toggleLiquidated(id);
    window.storage = storage;

    // --- COLLABORATORS ---
    openColabModal = async () => {
        const name = prompt("Nombre del colaborador:");
        if (name) await storage.saveColab({ name });
    };

    const renderColabs = async () => {
        if (!currentUser) return;
        const colabs = await storage.getColabs();
        const txs = await storage.getTransactions();
        const tbody = document.querySelector('#colobsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Update Colab List in Transactions Form
        const colabSelect = document.getElementById('txColab');
        if (colabSelect) {
            colabSelect.innerHTML = '<option value="">Ninguno (Uso Personal)</option>';
            colabs.forEach(c => {
                colabSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }

        colabs.forEach(c => {
            const cTxs = txs.filter(t => t.colabId === c.id);
            const earned = cTxs.reduce((sum, t) => sum + t.ganancia_colaborador, 0);
            tbody.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td>${cTxs.length}</td>
                    <td>${earned.toFixed(2)} USDT</td>
                    <td>
                        <button class="nav-btn small" onclick="storage.deleteColab('${c.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    };

    // --- CALCULATOR & GENERATOR ---
    const setupLegacyCalc = () => {
        const directionBtns = document.querySelectorAll('.toggle-btn');
        const inputBuy = document.getElementById('inputBuy');
        const inputSell = document.getElementById('inputSell');
        const inputProfit = document.getElementById('inputProfit');
        const resultTasa = document.getElementById('resultTasa');
        let currentDirection = 'COP_VES';

        const calculate = () => {
            const buy = parseFloat(inputBuy.value);
            const sell = parseFloat(inputSell.value);
            const profitPct = parseFloat(inputProfit.value);
            if (!buy || !sell) return;
            const ganancia = profitPct / 100;
            let tasa = currentDirection === 'COP_VES' ? (buy * (1 + ganancia)) / sell : (sell / buy) * (1 - ganancia);
            resultTasa.value = (Math.floor(tasa * 100) / 100).toFixed(2);
        };

        directionBtns.forEach(btn => btn.onclick = () => {
            directionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDirection = btn.dataset.direction;
            calculate();
        });

        [inputBuy, inputSell, inputProfit].forEach(i => i.oninput = calculate);
    };

    generateImage = () => {
        const rateCopVes = parseFloat(document.getElementById('genRateCopVes').value);
        const rateVesCop = parseFloat(document.getElementById('genRateVesCop').value);
        if (!rateCopVes || !rateVesCop) return alert("Ingresa tasas");

        document.getElementById('displayRateCopVes').textContent = rateCopVes.toFixed(2);
        document.getElementById('displayRateVesCop').textContent = rateVesCop.toFixed(2);
        document.getElementById('noteRateCopVes').textContent = (rateCopVes - 1).toFixed(2);
        document.getElementById('noteRateVesCop').textContent = (rateVesCop + 1).toFixed(2);

        const fillTable = (id, steps, rate, offset) => {
            const body = document.querySelector(`${id} tbody`);
            body.innerHTML = '';
            steps.forEach(amt => {
                const r = amt >= (id.includes('Cop') ? 1000000 : 5000) ? rate + offset : rate;
                const res = id.includes('Cop') ? amt / r : amt * r;
                body.innerHTML += `<tr><td>${id.includes('Cop') ? formatCurrency(amt, 'COP') : formatNumber(amt)}</td><td>${id.includes('Cop') ? formatNumber(res) : formatCurrency(res, 'COP')}</td></tr>`;
            });
        };

        fillTable('#tableCopVes', [25000, 40000, 50000, 100000, 200000, 500000, 1000000, 2000000], rateCopVes, -1);
        fillTable('#tableVesCop', [300, 400, 500, 1000, 2000, 5000, 10000], rateVesCop, 1);

        setTimeout(() => {
            html2canvas(document.getElementById('captureContainer'), {
                scale: 1, useCORS: true, allowTaint: true, backgroundColor: '#0f172a'
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `LuCash_Remesas.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        }, 500);
    };

    // --- HELPERS ---
    const formatCurrency = (v, c) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);
    const formatNumber = (v) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2 }).format(v);

    closeModal = (id) => document.getElementById(id).style.display = 'none';

    exportToExcel = async () => {
        const txs = await storage.getTransactions();
        const ws = XLSX.utils.json_to_sheet(txs);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
        XLSX.writeFile(wb, "LuCash_Export.xlsx");
    };

    const updateUI = async () => {
        await renderDashboard();
        await renderTransactions();
        await renderColabs();
    };

    // --- INIT ---
    setupLegacyCalc();
    showSection('dashboard');
});
