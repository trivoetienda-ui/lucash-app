/**
 * Render Service Module
 * Handles UI updates, table generation, and dashboard charts.
 */
class RenderService {
    constructor(dbService) {
        this.db = dbService;
        this.chart = null;
    }

    async renderDashboard(stats, colabSummary, txsForChart) {
        stats = stats || {};
        colabSummary = colabSummary || [];
        txsForChart = txsForChart || [];

        // Update main stat cards
        document.getElementById('statPeriodProfit').textContent = `${(stats.period_profit || 0).toFixed(2)} USDT`;
        document.getElementById('statUserGainMonth').textContent = `${(stats.user_gain || 0).toFixed(2)} USDT`;
        document.getElementById('statTotalPending').textContent = `${(stats.total_pending || 0).toFixed(2)} USDT`;

        document.getElementById('statVolCop').textContent = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(stats.vol_cop || 0);

        // Update Colab Summary Table
        const tbody = document.querySelector('#colabSummaryTable tbody');
        if (tbody) {
            tbody.innerHTML = colabSummary.map(c => `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.op_count}</td>
                    <td style="color:var(--secondary); font-weight:700">${Number(c.pending_amount).toFixed(2)} USDT</td>
                    <td>${Number(c.total_earned).toFixed(2)} USDT</td>
                </tr>
            `).join('');
        }

        // Render Chart using the txs provided (server already filtered these for the chart period)
        this.renderChart(txsForChart);
    }

    renderChart(txs) {
        const canvas = document.getElementById('profitChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        const grouped = txs.reduce((acc, tx) => {
            const date = tx.date || 'Sin Fecha';
            acc[date] = (acc[date] || 0) + Number(tx.ganancia_bruta || 0);
            return acc;
        }, {});

        const sorted = Object.keys(grouped).sort();
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })),
                datasets: [{
                    label: 'Ganancia (USDT)',
                    data: sorted.map(d => grouped[d]),
                    borderColor: '#10b981',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    renderTransactionsTable(txs, colabs, activeFilters = {}) {
        const tbody = document.querySelector('#transactionsTable tbody'); if (!tbody) return;
        tbody.innerHTML = '';

        // Server-side filtering is already done, so we just render what we got
        txs.forEach(tx => {
            const c = colabs.find(cl => cl.id === tx.colab_id);
            const hasEvidence = tx.evidence && Array.isArray(tx.evidence) && tx.evidence.length > 0;

            tbody.innerHTML += `<tr>
                <td><input type="checkbox" class="tx-checkbox" data-id="${tx.id}"></td>
                <td>${new Date(tx.date + 'T12:00:00').toLocaleDateString()}</td>
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
                <td>
                    <div class="action-menu">
                        <button class="menu-trigger" onclick="event.stopPropagation(); window.toggleActionMenu(this)">...</button>
                        <div class="menu-dropdown">
                            ${hasEvidence ? `<button class="menu-item-action" onclick="viewEvidence('${tx.id}')"><i data-lucide="image"></i> Ver Evidencia</button>` : ''}
                            <button class="menu-item-action" onclick="window.toggleLiquidated('${tx.id}', ${tx.liquidated})">
                                <i data-lucide="${tx.liquidated ? 'undo' : 'check-circle'}"></i> 
                                ${tx.liquidated ? 'Marcar Pendiente' : 'Marcar Liquidado'}
                            </button>
                            <button class="menu-item-action delete" onclick="window.deleteTransaction('${tx.id}')"><i data-lucide="trash-2"></i> Eliminar</button>
                        </div>
                    </div>
                </td>
            </tr>`;
        });
    }

    renderColabsTable(colabs, txs) {
        const tbody = document.querySelector('#colabTable tbody'); if (!tbody) return;
        tbody.innerHTML = colabs.map(c => {
            const cTxs = txs.filter(t => t.colab_id === c.id);
            return `<tr>
                <td>${c.name}</td>
                <td>${cTxs.length}</td>
                <td>${cTxs.reduce((s, t) => s + Number(t.ganancia_colaborador || 0), 0).toFixed(2)} USDT</td>
                <td>
                    <div class="action-menu">
                        <button class="menu-trigger" onclick="event.stopPropagation(); window.toggleActionMenu(this)">...</button>
                        <div class="menu-dropdown">
                            <button class="menu-item-action delete" onclick="window.deleteColab('${c.id}')"><i data-lucide="trash-2"></i> Eliminar</button>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    async generateSettlementReceipt(colabName, txs) {
        const container = document.getElementById('receiptContainer');
        if (!container) return;

        // Populate header info
        document.getElementById('receiptColabName').textContent = colabName;
        document.getElementById('receiptDate').textContent = new Date().toLocaleDateString();

        // Populate table body
        const tbody = document.getElementById('receiptTableBody');
        tbody.innerHTML = '';
        let total = 0;

        txs.forEach(tx => {
            const row = document.createElement('tr');
            const gain = Number(tx.ganancia_colaborador || 0);
            const fee = Number(tx.binance_fee_buy || 0) + Number(tx.binance_fee_sell || 0);
            total += gain;

            row.innerHTML = `
                <td>${new Date(tx.date + 'T12:00:00').toLocaleDateString()}</td>
                <td>${tx.type === 'COP_VES' ? '🇨🇴→🇻🇪' : '🇻🇪→🇨🇴'}</td>
                <td>${Number(tx.rate || 0).toFixed(2)}</td>
                <td>${new Intl.NumberFormat('es-CO').format(tx.amount_rec || 0)}</td>
                <td>${new Intl.NumberFormat('es-CO').format(tx.monto_entrego || 0)}</td>
                <td>${Number(tx.usdt_bought || 0).toFixed(2)}</td>
                <td>${Number(tx.usdt_sold || 0).toFixed(2)}</td>
                <td>${fee.toFixed(2)}</td>
                <td style="font-weight:700; color:#10b981">${gain.toFixed(2)} USDT</td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('receiptTotalAmount').textContent = `${total.toFixed(2)} USDT`;

        // Generate image
        try {
            await document.fonts.ready;
            const canvas = await html2canvas(container, {
                useCORS: true,
                scale: 1,
                backgroundColor: "#042421"
            });

            const base64 = canvas.toDataURL('image/png');

            // Upload to Storage
            const path = `receipts/${Date.now()}_${colabName.replace(/\s+/g, '_')}.png`;
            const publicUrl = await this.db.uploadFile('receipts', path, base64);

            return publicUrl;
        } catch (err) {
            console.error("Error generating/uploading receipt:", err);
            return null;
        }
    }

    renderSettlementsTable(settlements) {
        const tbody = document.querySelector('#settlementsTable tbody'); if (!tbody) return;
        tbody.innerHTML = settlements.map(s => `
            <tr>
                <td>${new Date(s.created_at).toLocaleString()}</td>
                <td>${s.colab_name || 'N/A'}</td>
                <td style="font-weight:700; color:#10b981">${Number(s.total_amount).toFixed(2)} USDT</td>
                <td>
                    <div class="action-menu">
                        <button class="menu-trigger" onclick="event.stopPropagation(); window.toggleActionMenu(this)">...</button>
                        <div class="menu-dropdown">
                            <button class="menu-item-action" onclick="window.viewSettlement('${s.id}')"><i data-lucide="image"></i> Ver Soporte</button>
                            <button class="menu-item-action" onclick="window.downloadSettlement('${s.id}')"><i data-lucide="download"></i> Descargar</button>
                            <button class="menu-item-action delete" onclick="window.deleteSettlement('${s.id}')"><i data-lucide="trash-2"></i> Eliminar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

window.RenderService = RenderService;
