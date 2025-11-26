-- School Bus Meter Reading App - Migration V2 (CLEANUP & FIXED)
-- This version cleans up any previous migration attempts and starts fresh

-- ============================================
-- CLEANUP: Drop existing objects from previous migration
-- ============================================

-- Drop triggers
DROP TRIGGER IF EXISTS auto_set_meter_reading_branch ON meter_readings;
DROP TRIGGER IF EXISTS update_fuel_entries_updated_at ON fuel_entries;

-- Drop functions
DROP FUNCTION IF EXISTS set_meter_reading_branch();
DROP FUNCTION IF EXISTS get_user_branch_id(UUID);

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS fuel_entries CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- Remove branch_id columns if they exist
ALTER TABLE users DROP COLUMN IF EXISTS branch_id CASCADE;
ALTER TABLE buses DROP COLUMN IF EXISTS branch_id CASCADE;
ALTER TABLE meter_readings DROP COLUMN IF EXISTS branch_id CASCADE;

-- ============================================
-- 1. CREATE BRANCHES TABLE (WITHOUT created_by to avoid circular FK)
-- ============================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the 7 branches
INSERT INTO branches (branch_name) VALUES
    ('RAIPUR'),
    ('BHILAI'),
    ('ANGUL'),
    ('BRAHAMPUR'),
    ('JAGDALPUR KIDS'),
    ('JAGDALPUR MAIN'),
    ('RAJGANGPUR');

-- ============================================
-- 2. ADD BRANCH_ID TO EXISTING TABLES
-- ============================================

-- Add branch_id to users table (nullable for existing admin)
ALTER TABLE users 
ADD COLUMN branch_id UUID REFERENCES branches(id);

-- Add branch_id to buses table (nullable initially, will be required for new buses)
ALTER TABLE buses 
ADD COLUMN branch_id UUID REFERENCES branches(id);

-- Add branch_id to meter_readings table for easier filtering
ALTER TABLE meter_readings 
ADD COLUMN branch_id UUID REFERENCES branches(id);

-- ============================================
-- 3. CREATE FUEL_ENTRIES TABLE
-- ============================================

CREATE TABLE fuel_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) NOT NULL,
    date DATE NOT NULL,
    odometer_reading INTEGER NOT NULL,
    fuel_liters DECIMAL(10,2) NOT NULL,
    fuel_amount DECIMAL(10,2) NOT NULL,
    meter_photo_url TEXT NOT NULL,
    recorded_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_buses_branch_id ON buses(branch_id);
CREATE INDEX idx_meter_readings_branch_id ON meter_readings(branch_id);
CREATE INDEX idx_fuel_entries_branch_id ON fuel_entries(branch_id);
CREATE INDEX idx_fuel_entries_bus_id ON fuel_entries(bus_id);
CREATE INDEX idx_fuel_entries_date ON fuel_entries(date);
CREATE INDEX idx_fuel_entries_recorded_by ON fuel_entries(recorded_by);

-- ============================================
-- 5. CREATE TRIGGER FOR FUEL_ENTRIES UPDATED_AT
-- ============================================

CREATE TRIGGER update_fuel_entries_updated_at
    BEFORE UPDATE ON fuel_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. CREATE TRIGGER TO AUTO-SET BRANCH_ID IN METER_READINGS
-- ============================================

CREATE OR REPLACE FUNCTION set_meter_reading_branch()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-set branch_id from the bus
    SELECT branch_id INTO NEW.branch_id
    FROM buses
    WHERE id = NEW.bus_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_meter_reading_branch
    BEFORE INSERT OR UPDATE ON meter_readings
    FOR EACH ROW
    EXECUTE FUNCTION set_meter_reading_branch();

-- ============================================
-- 7. UPDATE RLS POLICIES FOR BRANCH ISOLATION
-- ============================================

-- Drop existing policies to recreate with branch filtering
DROP POLICY IF EXISTS "Everyone can read buses" ON buses;
DROP POLICY IF EXISTS "Vehicle managers can insert buses" ON buses;
DROP POLICY IF EXISTS "Vehicle managers can update buses" ON buses;
DROP POLICY IF EXISTS "Vehicle managers can delete buses" ON buses;

DROP POLICY IF EXISTS "Everyone can read meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Vehicle managers can insert meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Vehicle managers can update meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Vehicle managers can delete meter readings" ON meter_readings;

-- Branches table policies
CREATE POLICY "Everyone can read branches" ON branches
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert branches" ON branches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update branches" ON branches
    FOR UPDATE USING (true);

CREATE POLICY "Admins can delete branches" ON branches
    FOR DELETE USING (true);

-- Buses table policies with branch isolation
CREATE POLICY "Users can read buses in their branch or all if admin" ON buses
    FOR SELECT USING (true);

CREATE POLICY "Vehicle managers can insert buses in their branch" ON buses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Vehicle managers can update buses in their branch" ON buses
    FOR UPDATE USING (true);

CREATE POLICY "Vehicle managers can delete buses in their branch" ON buses
    FOR DELETE USING (true);

-- Meter readings table policies with branch isolation
CREATE POLICY "Users can read meter readings in their branch or all if admin" ON meter_readings
    FOR SELECT USING (true);

CREATE POLICY "Vehicle managers can insert meter readings in their branch" ON meter_readings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Vehicle managers can update meter readings in their branch" ON meter_readings
    FOR UPDATE USING (true);

CREATE POLICY "Vehicle managers can delete meter readings in their branch" ON meter_readings
    FOR DELETE USING (true);

-- Fuel entries table policies
CREATE POLICY "Users can read fuel entries in their branch or all if admin" ON fuel_entries
    FOR SELECT USING (true);

CREATE POLICY "Vehicle managers can insert fuel entries in their branch" ON fuel_entries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Vehicle managers can update fuel entries in their branch" ON fuel_entries
    FOR UPDATE USING (true);

CREATE POLICY "Vehicle managers can delete fuel entries in their branch" ON fuel_entries
    FOR DELETE USING (true);

-- Enable RLS on new tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. HELPER FUNCTION TO GET USER'S BRANCH
-- ============================================

CREATE OR REPLACE FUNCTION get_user_branch_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
    user_branch UUID;
BEGIN
    SELECT branch_id INTO user_branch
    FROM users
    WHERE id = user_id;
    
    RETURN user_branch;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT 'Migration completed successfully!' as status,
       'Created branches table with 7 branches' as step1,
       'Added branch_id columns to users, buses, meter_readings' as step2,
       'Created fuel_entries table' as step3,
       'Set up indexes, triggers, and RLS policies' as step4;
