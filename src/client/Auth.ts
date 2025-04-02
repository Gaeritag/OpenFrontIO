export class Auth {
  private static instance: Auth;
  private loginButton: HTMLElement | null = null;
  private isLoggedIn: boolean = false;
  private sessionId: string | null = null;
  private username: string | null = null;

  private constructor() {
    this.initializeLoginButton();
    this.checkLoginStatus();
  }

  public static getInstance(): Auth {
    if (!Auth.instance) {
      Auth.instance = new Auth();
    }
    return Auth.instance;
  }

  private initializeLoginButton(): void {
    document.addEventListener('DOMContentLoaded', () => {
      this.loginButton = document.getElementById('discord-login-btn');
      
      if (this.loginButton) {
        this.loginButton.addEventListener('click', () => {
          if (this.isLoggedIn) {
            this.logout();
          } else {
            this.login();
          }
        });
      }
    });
  }

  private async checkLoginStatus(): Promise<void> {
    try {
      const response = await fetch('/api/auth/status');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.loggedIn) {
          this.isLoggedIn = true;
          this.sessionId = data.sessionId;
          this.username = data.username;
          this.updateLoginButton();
        } else {
          this.isLoggedIn = false;
          this.updateLoginButton();
        }
      } else {
        console.error('Failed to check login status');
        this.isLoggedIn = false;
        this.updateLoginButton();
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      this.isLoggedIn = false;
      this.updateLoginButton();
    }
  }

  private updateLoginButton(): void {
    if (!this.loginButton) {
      this.loginButton = document.getElementById('discord-login-btn');
      if (!this.loginButton) return;
    }
    
    if (this.isLoggedIn) {
      this.loginButton.textContent = `Logout (${this.username || 'User'})`;
      this.loginButton.classList.add('logged-in');
      this.loginButton.classList.remove('logged-out');
    } else {
      this.loginButton.textContent = 'Login with Discord';
      this.loginButton.classList.add('logged-out');
      this.loginButton.classList.remove('logged-in');
    }
  }

  private login(): void {
    localStorage.setItem('auth_redirect', window.location.href);
    window.location.href = '/api/auth/discord';
  }

  private async logout(): Promise<void> {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        this.isLoggedIn = false;
        this.sessionId = null;
        this.username = null;
        this.updateLoginButton();
      } else {
        console.error('Failed to logout');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  //to refresh login state man.
  public refreshAuthState(): void {
    this.checkLoginStatus();
  }
  public isAuthenticated(): boolean {
    return this.isLoggedIn;
  }
  public getSessionId(): string | null {
    return this.sessionId;
  }
  public getUsername(): string | null {
    return this.username;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  Auth.getInstance();
});
export function getAuth(): Auth {
  return Auth.getInstance();
}
