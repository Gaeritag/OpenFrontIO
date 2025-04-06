export interface AuthUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
}

export class AuthClient {
    private static readonly STORAGE_KEY = "discord_user";
    private static instance: AuthClient;
    private user: AuthUser | null = null;
    private listeners: Array<(user: AuthUser | null) => void> = [];

    private constructor() {
        
        this.loadUserFromStorage();
        
        
        this.handleAuthCallback();
    }

    static getInstance(): AuthClient {
        if (!AuthClient.instance) {
            AuthClient.instance = new AuthClient();
        }
        return AuthClient.instance;
    }

    public isAuthenticated(): boolean {
        return this.user !== null;
    }

    public getUser(): AuthUser | null {
        return this.user;
    }

    public login(): void {
        window.location.href = "/api/auth/discord";
    }

    public logout(): void {
        this.user = null;
        localStorage.removeItem(AuthClient.STORAGE_KEY);
        this.notifyListeners();
    }

    public addAuthChangeListener(listener: (user: AuthUser | null) => void): void {
        this.listeners.push(listener);
        listener(this.user);
    }

    public removeAuthChangeListener(listener: (user: AuthUser | null) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener(this.user);
        }
    }

    private loadUserFromStorage(): void {
        const storedUser = localStorage.getItem(AuthClient.STORAGE_KEY);
        if (storedUser) {
            try {
                this.user = JSON.parse(storedUser);
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem(AuthClient.STORAGE_KEY);
            }
        }
    }

    private handleAuthCallback(): void {
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get('auth_success');
        const userParam = urlParams.get('user');

        if (authSuccess === 'true' && userParam) {
            try {
                const user = JSON.parse(decodeURIComponent(userParam)) as AuthUser;
                this.user = user;
                localStorage.setItem(AuthClient.STORAGE_KEY, JSON.stringify(user));
                this.notifyListeners();
                
                // Clean up URL
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {
                console.error("Failed to parse user data from URL", e);
            }
        }

        // Handle auth errors
        const authError = urlParams.get('auth_error');
        if (authError) {
            console.error("Authentication error:", authError);
            // Clean up URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }
}

// Export a singleton instance
export const authClient = AuthClient.getInstance();