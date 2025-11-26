# 🚌 School Bus Meter Reading System

A Progressive Web App (PWA) for tracking school bus meter readings, fuel entries, and managing fleet operations across multiple branches.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/singhankit74/kvbms)

## ✨ Features

- 📊 **Daily Meter Readings** - Track departure and return readings with photo verification
- ⛽ **Fuel Entry Management** - Log fuel consumption, costs, and odometer readings
- 🏢 **Multi-Branch Support** - Manage 7 different branches independently
- 👥 **Role-Based Access** - Admin and Vehicle Manager roles with different permissions
- 📱 **Progressive Web App** - Install on any device (Android, iOS, Windows, Mac)
- 📥 **Excel Export** - Download detailed reports for meter readings and fuel entries
- 🔒 **Secure Authentication** - Bcrypt password hashing with database-level verification
- 📸 **Photo Upload & Compression** - Automatic image compression to ~200KB
- 🌐 **Offline Support** - Service Worker caching for offline access

## 🏗️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **PWA**: Service Workers, Web App Manifest
- **Authentication**: Custom auth with PostgreSQL bcrypt
- **Export**: SheetJS (xlsx) for Excel generation
- **Hosting**: Vercel (recommended) or Netlify

## 🚀 Live Demo

🔗 **[Live App](https://kvbms.vercel.app)** _(Update after deployment)_

## 📦 Installation & Setup

### Prerequisites
- Supabase account (free tier works)
- Git installed
- A local web server (Python, Node.js, or Live Server)

### 1. Clone the Repository

```bash
git clone https://github.com/singhankit74/kvbms.git
cd kvbms
```

### 2. Set Up Supabase

1. Create a new project at [Supabase](https://supabase.com)
2. Go to SQL Editor
3. Run the migration script: `database/migration_v2_final.sql`
4. Run the password verification function: `database/password_verification.sql`
5. Get your Supabase URL and Anon Key from Settings → API

### 3. Configure the App

Update `app.js` with your Supabase credentials:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 4. Create Admin Account

Run this SQL in Supabase SQL Editor:

```sql
INSERT INTO users (email, password_hash, full_name, role, branch_id)
VALUES (
    'admin@schoolbus.com',
    crypt('admin123', gen_salt('bf')),
    'System Admin',
    'admin',
    NULL
);
```

### 5. Serve Locally

```bash
# Using Python
python -m http.server 8000

# OR using Node.js
npx http-server -p 8000

# OR using Live Server in VS Code
# Right-click index.html → Open with Live Server
```

Open `http://localhost:8000`

## 🔑 Default Credentials

- **Admin**: admin@schoolbus.com / admin123

## 🏢 Branches

The system supports 7 branches:
- RAIPUR
- BHILAI
- ANGUL
- BRAHAMPUR
- JAGDALPUR KIDS
- JAGDALPUR MAIN
- RAJGANGPUR

## 📱 PWA Installation

The app can be installed on:
- **Android** - Via Chrome (Add to Home Screen)
- **iOS** - Via Safari (Add to Home Screen)
- **Windows/Mac/Linux** - Via Chrome/Edge (Install button in address bar)

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. Fork this repository
2. Go to [Vercel](https://vercel.com)
3. Click "New Project"
4. Import your forked repository
5. Click "Deploy"
6. Update Supabase CORS settings with your Vercel URL

### Deploy to Netlify

1. Fork this repository
2. Go to [Netlify](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repository
5. Click "Deploy"

## 📸 Screenshots

_Add screenshots here after deployment_

## 🛠️ Development

### Project Structure

```
kvbms/
├── index.html              # Login page
├── admin-dashboard.html    # Admin interface
├── manager-dashboard.html  # Vehicle manager interface
├── styles.css             # Global styles
├── app.js                 # Supabase configuration
├── auth.js                # Authentication logic
├── utils.js               # Utility functions
├── admin-dashboard.js     # Admin dashboard logic
├── manager-dashboard.js   # Manager dashboard logic
├── service-worker.js      # PWA service worker
├── manifest.json          # PWA manifest
├── vercel.json           # Vercel configuration
├── icons/                # App icons
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── database/             # SQL migration scripts
    ├── migration_v2_final.sql
    └── password_verification.sql
```

### Making Changes

```bash
# Create a new branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to GitHub
git push origin feature/your-feature

# Create a Pull Request on GitHub
```

## 🔒 Security

- ✅ Bcrypt password hashing
- ✅ Row Level Security (RLS) in Supabase
- ✅ HTTPS only (enforced in production)
- ✅ CORS protection
- ✅ XSS protection headers
- ✅ Content Security Policy

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 👨‍💻 Author

**Ankit Singh**
- GitHub: [@singhankit74](https://github.com/singhankit74)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Made with ❤️ for efficient school bus fleet management
