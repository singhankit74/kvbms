# Multi-Branch & Fuel Entry - Setup Guide

## Overview

This migration adds multi-branch support and fuel entry tracking to the School Bus Meter Reading App.

## New Features

### 1. Multi-Branch System (7 Branches)

**Branches:**
- RAIPUR
- BHILAI
- ANGUL
- BRAHAMPUR
- JAGDALPUR KIDS
- JAGDALPUR MAIN
- RAJGANGPUR

**Branch Isolation:**
- Each Vehicle Manager is assigned to ONE branch
- Vehicle Managers can ONLY see/manage data from their assigned branch
- Admin can see ALL data from ALL branches
- Admin can filter data by branch

### 2. Fuel Entry Module

**Features:**
- Record fuel fill-ups with odometer reading
- Track liters filled and amount paid (₹)
- Upload meter photo (compressed to <200KB)
- Branch-wise isolation
- Separate Excel export for fuel reports

## Setup Instructions

### Step 1: Run Database Migration

1. Open Supabase Dashboard: https://thavlshywlvyewvckwzl.supabase.co
2. Go to **SQL Editor**
3. Open `database/migration_v2.sql`
4. Copy and paste the entire SQL script
5. Click **Run** to execute

### Step 2: Verify Migration

Check that the following were created:

**New Tables:**
- ✅ `branches` - Contains 7 branches
- ✅ `fuel_entries` - Stores fuel fill-up records

**Updated Tables:**
- ✅ `users` - Now has `branch_id` column
- ✅ `buses` - Now has `branch_id` column
- ✅ `meter_readings` - Now has `branch_id` column

**Storage:**
- ✅ `meter-photos` bucket still exists and is public

### Step 3: Assign Branches to Existing Data

If you have existing vehicle managers and buses, you need to assign them to branches:

```sql
-- Example: Assign a vehicle manager to RAIPUR branch
UPDATE users 
SET branch_id = (SELECT id FROM branches WHERE branch_name = 'RAIPUR')
WHERE email = 'manager@example.com';

-- Example: Assign buses to branches
UPDATE buses 
SET branch_id = (SELECT id FROM branches WHERE branch_name = 'RAIPUR')
WHERE created_by = (SELECT id FROM users WHERE email = 'manager@example.com');
```

### Step 4: Test the Application

1. **Login as Admin**
   - Email: `admin@schoolbus.com`
   - Password: `admin123`

2. **Create Vehicle Managers**
   - Go to "Vehicle Managers" section
   - Click "+ Add Manager"
   - Fill in details and **select a branch**
   - Save

3. **Login as Vehicle Manager**
   - Use credentials created by admin
   - Verify branch name appears in header
   - Add buses (branch is auto-assigned)
   - Record meter readings
   - Add fuel entries

4. **Test Branch Filtering (Admin)**
   - Use branch filter dropdown in header
   - Verify data is filtered correctly
   - Export Excel reports (filtered by branch)

## New Admin Features

### Branch Management
- View all 7 branches
- Branches are pre-created (cannot add/delete)
- Assign branches to vehicle managers

### Branch Filtering
- Filter dropdown in dashboard header
- Applies to:
  - Vehicle Managers list
  - Buses list
  - Meter Readings list
  - Fuel Entries list
  - Statistics

### Fuel Entries
- View all fuel entries from all branches
- Filter by branch
- Export to Excel with all fields

## New Vehicle Manager Features

### Branch Display
- Branch name shown in dashboard header
- All data automatically filtered to assigned branch

### Fuel Entry Management
- Add fuel entries for buses
- Fields:
  - Select Bus (from assigned branch)
  - Odometer Reading (km)
  - Fuel Filled (Liters)
  - Amount (₹)
  - Meter Photo (compressed)
- View fuel entry history
- Delete fuel entries

### Branch-Locked Bus Creation
- Branch is automatically set to manager's assigned branch
- Cannot create buses in other branches

## Excel Reports

### Meter Readings Report
**Fields:**
- Date
- Branch
- Bus Number
- Driver Name
- Route Name
- Departure Reading
- Departure Time
- Return Reading
- Return Time
- Distance Traveled

### Fuel Entries Report
**Fields:**
- Date
- Branch
- Bus Number
- Driver Name
- Route Name
- Odometer Reading
- Fuel Liters
- Fuel Amount (₹)
- Recorded By

## Database Schema Changes

### branches table
```sql
- id (uuid, primary key)
- branch_name (text, unique)
- created_at (timestamp)
- created_by (uuid, foreign key to users)
```

### fuel_entries table
```sql
- id (uuid, primary key)
- bus_id (uuid, foreign key to buses)
- branch_id (uuid, foreign key to branches)
- date (date)
- odometer_reading (integer)
- fuel_liters (decimal)
- fuel_amount (decimal)
- meter_photo_url (text)
- recorded_by (uuid, foreign key to users)
- created_at (timestamp)
- updated_at (timestamp)
```

### Updated columns
- `users.branch_id` - References branches table
- `buses.branch_id` - References branches table
- `meter_readings.branch_id` - Auto-set from bus's branch

## Security (RLS Policies)

### Branch Isolation
- Vehicle Managers can only see data from their assigned branch
- Admin can see all data
- RLS policies enforce branch filtering at database level

### Fuel Entries
- Vehicle Managers can only create/view/delete fuel entries in their branch
- Admin can view all fuel entries
- Photos stored in public `meter-photos` bucket

## Troubleshooting

**Issue:** Vehicle manager can't see any buses
- **Solution:** Ensure manager has `branch_id` assigned
- **Check:** Run `SELECT * FROM users WHERE role = 'vehicle_manager'`

**Issue:** Buses not showing for vehicle manager
- **Solution:** Ensure buses have correct `branch_id`
- **Check:** Run `SELECT * FROM buses WHERE branch_id = 'manager_branch_id'`

**Issue:** Fuel entry submission fails
- **Solution:** Ensure bus belongs to manager's branch
- **Check:** Verify `branch_id` matches between user and bus

**Issue:** Branch filter not working
- **Solution:** Clear browser cache and reload
- **Check:** Verify migration ran successfully

## Migration Rollback

If you need to rollback the migration:

```sql
-- Remove new columns
ALTER TABLE users DROP COLUMN IF EXISTS branch_id;
ALTER TABLE buses DROP COLUMN IF EXISTS branch_id;
ALTER TABLE meter_readings DROP COLUMN IF EXISTS branch_id;

-- Drop new tables
DROP TABLE IF EXISTS fuel_entries;
DROP TABLE IF EXISTS branches;
```

⚠️ **Warning:** This will delete all fuel entry data!

## Support

For issues:
1. Check Supabase dashboard for errors
2. Verify migration ran successfully
3. Check browser console for JavaScript errors
4. Ensure all users have branch_id assigned

---

**Migration Complete!** 🎉

Your app now supports multi-branch operations and fuel entry tracking!
