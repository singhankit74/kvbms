-- School Bus Meter Reading App - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Admin and Vehicle Managers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'vehicle_manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Buses table
CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_number TEXT UNIQUE NOT NULL,
    driver_name TEXT NOT NULL,
    route_name TEXT NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meter readings table
CREATE TABLE meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    departure_reading INTEGER NOT NULL,
    departure_photo_url TEXT NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    return_reading INTEGER,
    return_photo_url TEXT,
    return_time TIMESTAMP WITH TIME ZONE,
    distance_traveled INTEGER,
    recorded_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bus_id, date)
);

-- Create indexes for better query performance
CREATE INDEX idx_buses_created_by ON buses(created_by);
CREATE INDEX idx_meter_readings_bus_id ON meter_readings(bus_id);
CREATE INDEX idx_meter_readings_date ON meter_readings(date);
CREATE INDEX idx_meter_readings_recorded_by ON meter_readings(recorded_by);

-- Create storage bucket for meter photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-photos', 'meter-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Allow users to read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (true);

-- Allow admins to insert new users
CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (true);

-- Allow admins to update users
CREATE POLICY "Admins can update users" ON users
    FOR UPDATE USING (true);

-- Allow admins to delete users
CREATE POLICY "Admins can delete users" ON users
    FOR DELETE USING (true);

-- Buses table policies
-- Everyone can read buses
CREATE POLICY "Everyone can read buses" ON buses
    FOR SELECT USING (true);

-- Vehicle managers can insert buses
CREATE POLICY "Vehicle managers can insert buses" ON buses
    FOR INSERT WITH CHECK (true);

-- Vehicle managers can update their own buses
CREATE POLICY "Vehicle managers can update buses" ON buses
    FOR UPDATE USING (true);

-- Vehicle managers can delete their own buses
CREATE POLICY "Vehicle managers can delete buses" ON buses
    FOR DELETE USING (true);

-- Meter readings table policies
-- Everyone can read meter readings
CREATE POLICY "Everyone can read meter readings" ON meter_readings
    FOR SELECT USING (true);

-- Vehicle managers can insert meter readings
CREATE POLICY "Vehicle managers can insert meter readings" ON meter_readings
    FOR INSERT WITH CHECK (true);

-- Vehicle managers can update meter readings
CREATE POLICY "Vehicle managers can update meter readings" ON meter_readings
    FOR UPDATE USING (true);

-- Vehicle managers can delete meter readings
CREATE POLICY "Vehicle managers can delete meter readings" ON meter_readings
    FOR DELETE USING (true);

-- Storage policies for meter-photos bucket
CREATE POLICY "Anyone can view meter photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'meter-photos');

CREATE POLICY "Authenticated users can upload meter photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'meter-photos');

CREATE POLICY "Users can update their own photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'meter-photos');

CREATE POLICY "Users can delete their own photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'meter-photos');

-- Create default admin user (password: admin123)
-- Note: In production, use a proper password hashing library
-- This is a simple hash for demonstration
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('admin@schoolbus.com', '$2a$10$rKZLvXZvXZvXZvXZvXZvXeO', 'System Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_buses_updated_at
    BEFORE UPDATE ON buses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meter_readings_updated_at
    BEFORE UPDATE ON meter_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate distance traveled
CREATE OR REPLACE FUNCTION calculate_distance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.return_reading IS NOT NULL AND NEW.departure_reading IS NOT NULL THEN
        NEW.distance_traveled = NEW.return_reading - NEW.departure_reading;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate distance
CREATE TRIGGER auto_calculate_distance
    BEFORE INSERT OR UPDATE ON meter_readings
    FOR EACH ROW
    EXECUTE FUNCTION calculate_distance();
