class Auth {
  static instance;
  loginButton = null;
  isLoggedIn = false;
  sessionId = null;
  username = null;

  constructor() {
    this.initializeLoginButton();
    this.checkLoginStatus();
  }

  static getInstance() {
    if (!Auth.instance) {
      Auth.instance = new Auth();
    }
    return Auth.instance;
  }

  initializeLoginButton() {
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

  async checkLoginStatus() {
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

  updateLoginButton() {
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

  login() {
    localStorage.setItem('auth_redirect', window.location.href);
    window.location.href = '/api/auth/discord';
  }

  async logout() {
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

  refreshAuthState() {
    this.checkLoginStatus();
  }

  isAuthenticated() {
    return this.isLoggedIn;
  }

  getSessionId() {
    return this.sessionId;
  }

  getUsername() {
    return this.username;
  }
}


document.addEventListener('DOMContentLoaded', () => {
  Auth.getInstance();
});


export function getAuth() {
  return Auth.getInstance();
}


export default Auth;
