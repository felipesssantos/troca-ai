-- Add is_public to profiles (Default TRUE for backward compatibility)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Add is_public to user_albums (Default TRUE)
ALTER TABLE user_albums 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
