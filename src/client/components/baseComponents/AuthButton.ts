import { authClient, AuthUser } from "../../AuthClient";

export class AuthButton {
    private element: HTMLElement;
    private loggedIn = false;

    constructor(containerId: string) {
        this.element = document.getElementById(containerId) || document.createElement('div');
        if (!document.getElementById(containerId)) {
            document.body.appendChild(this.element);
        }
        this.render();
        this.setupListeners();
    }

    private setupListeners(): void {
        authClient.addAuthChangeListener((user) => {
            this.loggedIn = !!user;
            this.render();
        });
    }

    private render(): void {
        if (this.loggedIn) {
            const user = authClient.getUser()!;
            this.renderLoggedIn(user);
        } else {
            this.renderLoggedOut();
        }
    }

    private renderLoggedIn(user: AuthUser): void {
        // Create logout button with user info
        this.element.innerHTML = `
            <div class="auth-container">
                <div class="user-info">
                    <span class="username">${user.username}</span>
                    ${user.avatar ? 
                        `<img class="avatar" src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" alt="Avatar" />` : 
                        '<div class="avatar-placeholder"></div>'}
                </div>
                <button id="logout-button" class="auth-button logout">Logout</button>
            </div>
        `;
        
        // Add event listener to logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                authClient.logout();
            });
        }
    }

    private renderLoggedOut(): void {
        // Create login button
        this.element.innerHTML = `
            <div class="auth-container">
                <button id="login-button" class="auth-button login">Login with Discord</button>
            </div>
        `;
        
        // Add event listener to login button
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                authClient.login();
            });
        }
    }
}