
-- Add username column to profiles table (if not already present)
-- Run this in your Supabase SQL Editor

-- 1. Add username column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username text;

-- 2. Make username unique (optional but recommended)
ALTER TABLE profiles
ADD CONSTRAINT IF NOT EXISTS profiles_username_key UNIQUE (username);

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);
