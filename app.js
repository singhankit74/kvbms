// Supabase Configuration
const SUPABASE_URL = 'https://thavlshywlvyewvckwzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYXZsc2h5d2x2eWV3dmNrd3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDA4NDIsImV4cCI6MjA3OTYxNjg0Mn0.u28TDZwDbWvhCNaqCmvLcBkCVQ4jCKqp_vdCoc2NUUw';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Session Management
const SessionManager = {
    setUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },
    
    getUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },
    
    clearUser() {
        localStorage.removeItem('currentUser');
    },
    
    isAuthenticated() {
        return this.getUser() !== null;
    }
};

// Utility Functions
const Utils = {
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            setTimeout(() => element.classList.remove('show'), 5000);
        }
    },
    
    showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            setTimeout(() => element.classList.remove('show'), 5000);
        }
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatDateTime(dateString) {
        return `${this.formatDate(dateString)} ${this.formatTime(dateString)}`;
    },
    
    setLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (loading) {
                button.classList.add('loading');
                button.disabled = true;
            } else {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }
    },
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
};

// Logout Function
function logout() {
    SessionManager.clearUser();
    window.location.href = 'index.html';
}

// Check authentication on page load
function checkAuth(requiredRole = null) {
    const user = SessionManager.getUser();
    
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        window.location.href = 'index.html';
        return null;
    }
    
    return user;
}
