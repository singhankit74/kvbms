-- School Bus Meter Reading App - Migration V2 (SIMPLE & CLEAN)
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- STEP 1: Clean up (ignore errors if objects don't exist)
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS auto_set_meter_reading_branch ON meter_readings;
DROP TRIGGER IF EXISTS update_fuel_entries_updated_at ON fuel_entries;

-- Drop functions
DROP FUNCTION IF EXISTS set_meter_reading_branch();
DROP FUNCTION IF EXISTS get_user_branch_id(UUID);

-- Drop tables
DROP TABLE IF EXISTS fuel_entries CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- Remove columns
ALTER TABLE users DROP COLUMN IF EXISTS branch_id CASCADE;
ALTER TABLE buses DROP COLUMN IF EXISTS branch_id CASCADE;
ALTER TABLE meter_readings DROP COLUMN IF EXISTS branch_id CASCADE;

-- Drop old policies
DROP POLICY IF EXISTS "Everyone can read buses" ON buses;
DROP POLICY IF EXISTS "Vehicle managers can insert buses" ON buses;
DROP POLICY IF EXISTS "Vehicle managers can update buses" ON buses;
DROP POLICY IF EXISTS "Vehicle managers can delete buses" ON buses;
DROP POLICY IF EXISTS "Everyone can read meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Vehicle managers can insert meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Vehicle managers can update meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Vehicle managers can delete meter readings" ON meter_readings;

-- ============================================
-- STEP 2: Create branches table
-- ============================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO branches (branch_name) VALUES
    ('RAIPUR'),
    ('BHILAI'),
    ('ANGUL'),
    ('BRAHAMPUR'),
    ('JAGDALPUR KIDS'),
    ('JAGDALPUR MAIN'),
    ('RAJGANGPUR');

-- ============================================
-- STEP 3: Add branch_id columns
-- ============================================

ALTER TABLE users ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE buses ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE meter_readings ADD COLUMN branch_id UUID REFERENCES branches(id);

-- ============================================
-- STEP 4: Create fuel_entries table
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
-- STEP 5: Create indexes
-- ============================================

CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_buses_branch_id ON buses(branch_id);
CREATE INDEX idx_meter_readings_branch_id ON meter_readings(branch_id);
CREATE INDEX idx_fuel_entries_branch_id ON fuel_entries(branch_id);
CREATE INDEX idx_fuel_entries_bus_id ON fuel_entries(bus_id);
CREATE INDEX idx_fuel_entries_date ON fuel_entries(date);

-- ============================================
-- STEP 6: Create triggers
-- ============================================

-- Trigger for fuel_entries updated_at
CREATE TRIGGER update_fuel_entries_updated_at
    BEFORE UPDATE ON fuel_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-set branch_id in meter_readings
CREATE OR REPLACE FUNCTION set_meter_reading_branch()
RETURNS TRIGGER AS $$
BEGIN
    SELECT branch_id INTO NEW.branch_id FROM buses WHERE id = NEW.bus_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set branch_id
CREATE TRIGGER auto_set_meter_reading_branch
    BEFORE INSERT OR UPDATE ON meter_readings
    FOR EACH ROW
    EXECUTE FUNCTION set_meter_reading_branch();

-- ============================================
-- STEP 7: Create RLS policies
-- ============================================

-- Branches policies
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Admins can manage branches" ON branches FOR ALL USING (true);

-- Buses policies
CREATE POLICY "Users can read buses" ON buses FOR SELECT USING (true);
CREATE POLICY "Managers can manage buses" ON buses FOR ALL USING (true);

-- Meter readings policies
CREATE POLICY "Users can read meter readings" ON meter_readings FOR SELECT USING (true);
CREATE POLICY "Managers can manage meter readings" ON meter_readings FOR ALL USING (true);

-- Fuel entries policies
ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read fuel entries" ON fuel_entries FOR SELECT USING (true);
CREATE POLICY "Managers can manage fuel entries" ON fuel_entries FOR ALL USING (true);

-- ============================================
-- STEP 8: Helper function
-- ============================================

CREATE OR REPLACE FUNCTION get_user_branch_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
    user_branch UUID;
BEGIN
    SELECT branch_id INTO user_branch FROM users WHERE id = user_id;
    RETURN user_branch;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUCCESS!
-- ============================================

SELECT 
    'Migration completed!' as status,
    (SELECT COUNT(*) FROM branches) as branches_created,
    'Run the UPDATE query to assign branches to users' as next_step;
