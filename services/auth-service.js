/**
 * Auth Service Module
 * Handles authentication flows with Supabase.
 */
class AuthService {
    constructor(supabaseClient) {
        this.client = supabaseClient;
    }

    async signUp(email, password) {
        const { data, error } = await this.client.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    }

    async signIn(email, password) {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async signOut() {
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
    }

    async getCurrentUser() {
        const { data: { user } } = await this.client.auth.getUser();
        return user;
    }

    onAuthStateChange(callback) {
        return this.client.auth.onAuthStateChange(callback);
    }
}

window.AuthService = AuthService;
