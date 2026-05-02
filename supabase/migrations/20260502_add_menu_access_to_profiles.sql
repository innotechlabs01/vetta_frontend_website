ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS menu_access text[] DEFAULT NULL;

COMMENT ON COLUMN profiles.menu_access IS 'User-specific menu paths that override role-based access. NULL means use role-based only.';
