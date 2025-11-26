# Database Setup Instructions

## Step 1: Run the Schema

1. Go to your Supabase Dashboard: https://thavlshywlvyewvckwzl.supabase.co
2. Navigate to **SQL Editor**
3. Copy the entire contents of `schema.sql`
4. Paste and run the SQL script

## Step 2: Verify Tables Created

Check that the following tables exist:
- `users`
- `buses`
- `meter_readings`

## Step 3: Verify Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Verify that `meter-photos` bucket exists
3. Ensure it's set to **Public**

## Default Admin Credentials

**Email:** admin@schoolbus.com  
**Password:** admin123

⚠️ **Important:** Change the admin password after first login in production!

## Notes

- The schema includes Row Level Security (RLS) policies
- Auto-calculation of distance traveled is handled by database trigger
- Images will be stored in the `meter-photos` storage bucket
- All timestamps are stored in UTC with timezone support
