# School Bus Meter Reading App

A mobile-friendly web application for tracking daily school bus meter readings with photo documentation.

## 🚀 Features

### Admin Dashboard
- ✅ Create, edit, and delete Vehicle Manager accounts
- ✅ View all buses and meter readings
- ✅ Export daily/weekly/monthly reports to Excel
- ✅ Real-time statistics dashboard

### Vehicle Manager Dashboard
- ✅ Add, edit, and delete buses (Bus Number, Driver Name, Route Name)
- ✅ Record daily departure readings with meter photos
- ✅ Record return readings with meter photos
- ✅ Auto-calculated distance traveled
- ✅ View today's readings and pending returns

### Image Processing
- ✅ Client-side image compression to <200KB
- ✅ Automatic resizing to ~1024px width
- ✅ Real-time preview and size display
- ✅ Maintains image clarity for auditing

## 📋 Setup Instructions

### 1. Database Setup

1. Go to your Supabase Dashboard: https://thavlshywlvyewvckwzl.supabase.co
2. Navigate to **SQL Editor**
3. Open `database/schema.sql`
4. Copy and paste the entire SQL script
5. Run the script to create tables, storage bucket, and policies

### 2. Verify Setup

Check that the following were created:
- Tables: `users`, `buses`, `meter_readings`
- Storage bucket: `meter-photos` (set to public)
- Default admin user created

### 3. Run the Application

Simply open `index.html` in a web browser or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000`

## 🔐 Default Credentials

**Admin Account:**
- Email: `admin@schoolbus.com`
- Password: `admin123`

⚠️ **Important:** Change the admin password after first login in production!

## 📱 Usage Workflow

### For Admin:
1. Login with admin credentials
2. Create Vehicle Manager accounts
3. View all buses and meter readings
4. Export reports to Excel (daily/weekly/monthly)

### For Vehicle Manager:
1. Login with credentials provided by admin
2. Add buses with bus number, driver name, and route name
3. Each day:
   - Select a bus and record **departure** reading + photo
   - When bus returns, record **return** reading + photo
   - Distance is automatically calculated

## 📊 Excel Report Fields

The exported Excel file includes:
- Date
- Bus Number
- Driver Name
- Route Name
- Departure Reading
- Departure Photo URL
- Departure Time
- Return Reading
- Return Photo URL
- Return Time
- Distance Traveled

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Supabase (PostgreSQL + Storage)
- **Libraries:**
  - Supabase JS Client
  - SheetJS (Excel export)
  - Custom image compression utility

## 📁 Project Structure

```
school buses system/
├── index.html              # Login page
├── admin-dashboard.html    # Admin dashboard
├── manager-dashboard.html  # Vehicle manager dashboard
├── styles.css             # Global styles
├── app.js                 # Core app logic
├── auth.js                # Authentication logic
├── utils.js               # Utility functions
├── admin-dashboard.js     # Admin dashboard logic
├── manager-dashboard.js   # Manager dashboard logic
└── database/
    ├── schema.sql         # Database schema
    └── README.md          # Database setup guide
```

## 🎨 Design Features

- Modern, premium UI with gradients and animations
- Fully responsive (mobile-first design)
- Dark mode compatible color scheme
- Smooth transitions and micro-animations
- Touch-friendly interface for mobile devices

## 🔒 Security Features

- Row Level Security (RLS) policies on all tables
- Role-based access control (Admin vs Vehicle Manager)
- Session management with localStorage
- Secure image storage with Supabase Storage

## 📝 Notes

- Images are automatically compressed to meet the 200KB requirement
- Distance traveled is auto-calculated by database trigger
- Each bus can only have one reading per day
- Return reading must be greater than or equal to departure reading

## 🐛 Troubleshooting

**Issue:** Can't login
- Verify database schema is properly set up
- Check browser console for errors
- Ensure Supabase credentials are correct

**Issue:** Image upload fails
- Check if storage bucket `meter-photos` exists and is public
- Verify image is a valid format (JPEG, PNG, WebP)
- Ensure image is under 10MB before compression

**Issue:** Excel export not working
- Ensure SheetJS library is loaded
- Check browser console for errors
- Verify readings exist for the selected date range

## 📞 Support

For issues or questions, please check:
1. Database setup in `database/README.md`
2. Browser console for error messages
3. Supabase dashboard for data verification

---

Built with ❤️ for efficient school bus management
