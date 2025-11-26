-- Fix for password verification
-- This creates a function that can verify bcrypt passwords

-- Create a function to verify passwords
CREATE OR REPLACE FUNCTION verify_user_password(user_email TEXT, user_password TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    branch_id UUID,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.branch_id,
        (u.password_hash = crypt(user_password, u.password_hash)) as is_valid
    FROM users u
    WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO authenticated;
