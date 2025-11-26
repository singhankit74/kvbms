// Authentication Logic
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // Check if already logged in
    if (SessionManager.isAuthenticated()) {
        const user = SessionManager.getUser();
        redirectToDashboard(user.role);
        return;
    }

    loginForm.addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.classList.remove('show');
    Utils.setLoading('loginBtn', true);

    try {
        // Use the database function to verify password
        const { data, error } = await supabase
            .rpc('verify_user_password', {
                user_email: email,
                user_password: password
            });

        if (error) {
            console.error('Database error:', error);
            throw new Error('Login failed. Please try again.');
        }

        if (!data || data.length === 0) {
            throw new Error('Invalid email or password');
        }

        const result = data[0];

        if (!result.is_valid) {
            throw new Error('Invalid email or password');
        }

        // Store user session
        SessionManager.setUser({
            id: result.id,
            email: result.email,
            full_name: result.full_name,
            role: result.role
        });

        // Redirect to appropriate dashboard
        redirectToDashboard(result.role);

    } catch (error) {
        console.error('Login error:', error);
        Utils.showError('errorMessage', error.message);
    } finally {
        Utils.setLoading('loginBtn', false);
    }
}

// No longer needed - password verification is done in the database
// async function verifyPassword(password, hash) {
//     // Password verification is now handled by the database function
// }

function redirectToDashboard(role) {
    if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else if (role === 'vehicle_manager') {
        window.location.href = 'manager-dashboard.html';
    } else {
        throw new Error('Invalid user role');
    }
}
