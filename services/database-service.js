/**
 * Database Service Module
 * Handles all interactions with Supabase tables.
 */
class DatabaseService {
    constructor(supabaseClient) {
        this.client = supabaseClient;
    }

    async getTransactions(filters = {}) {
        let query = this.client.from('transactions').select('*').order('date', { ascending: false });

        if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
        if (filters.dateTo) query = query.lte('date', filters.dateTo);
        if (filters.colab_id) query = query.eq('colab_id', filters.colab_id);
        if (filters.type) query = query.eq('type', filters.type);
        if (filters.status) {
            query = query.eq('liquidated', filters.status === 'liquidated');
        }

        // Default limit to 100 to avoid massive egress if no filters
        if (!filters.dateFrom && !filters.dateTo) {
            query = query.limit(100);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async uploadFile(bucket, path, file) {
        // file can be a File object or a Base64 string
        let body = file;
        if (typeof file === 'string' && file.startsWith('data:')) {
            // Convert base64 to Blob
            const res = await fetch(file);
            body = await res.blob();
        }

        const { data, error } = await this.client.storage.from(bucket).upload(path, body, {
            upsert: true,
            contentType: body.type || 'image/png'
        });

        if (error) throw error;

        // Return public URL
        const { data: { publicUrl } } = this.client.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
    }

    async saveTransaction(tx, userId) {
        const { error } = await this.client.from('transactions').upsert({ ...tx, user_id: userId });
        if (error) throw error;
    }

    async deleteTransaction(id) {
        const { error } = await this.client.from('transactions').delete().eq('id', id);
        if (error) throw error;
    }

    async toggleLiquidated(id, currentState) {
        const { error } = await this.client.from('transactions').update({ liquidated: !currentState }).eq('id', id);
        if (error) throw error;
    }

    async bulkLiquidate(ids) {
        const { error } = await this.client.from('transactions').update({ liquidated: true }).in('id', ids);
        if (error) throw error;
    }

    async getColaboradores() {
        const { data } = await this.client.from('collaborators').select('*').order('name');
        return data || [];
    }

    async getDashboardStats(startDate, endDate) {
        const { data, error } = await this.client.rpc('get_dashboard_stats', {
            p_start_date: startDate || null,
            p_end_date: endDate || null
        });
        if (error) throw error;
        return data;
    }

    async getColabSummary(startDate, endDate) {
        const { data, error } = await this.client.rpc('get_colab_summary', {
            p_start_date: startDate || null,
            p_end_date: endDate || null
        });
        if (error) throw error;
        return data || [];
    }

    async getSettlements() {
        const { data } = await this.client.from('settlements').select('*').order('created_at', { ascending: false });
        return data || [];
    }

    async saveSettlement(settlement, userId) {
        const { error } = await this.client.from('settlements').insert({ ...settlement, user_id: userId });
        if (error) throw error;
    }

    async deleteSettlement(id) {
        const { error } = await this.client.from('settlements').delete().eq('id', id);
        if (error) throw error;
    }

    async saveColaborador(colab, userId) {
        const { error } = await this.client.from('collaborators').upsert({ ...colab, user_id: userId });
        if (error) throw error;
    }

    async deleteColaborador(id) {
        const { error } = await this.client.from('collaborators').delete().eq('id', id);
        if (error) throw error;
    }
}

window.DBService = DatabaseService;
