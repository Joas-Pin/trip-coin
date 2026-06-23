
-- Setup script for "comprovantes" storage bucket and RLS policies
-- Run this in your Supabase SQL Editor

-- First, let's delete any existing policies for this bucket to avoid conflicts
DROP POLICY IF EXISTS "Users can upload files to comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files in comprovantes" ON storage.objects;

-- 1. Create the "comprovantes" storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprovantes',
  'comprovantes',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE 
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Create simple, working RLS policies for "comprovantes" bucket
-- Policy 1: Allow authenticated users to upload ANY file to comprovantes bucket
CREATE POLICY "Authenticated users can upload to comprovantes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes'
);

-- Policy 2: Allow authenticated users to view ANY file in comprovantes bucket
CREATE POLICY "Authenticated users can view comprovantes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes'
);

-- Policy 3: Allow authenticated users to delete ANY file in comprovantes bucket
CREATE POLICY "Authenticated users can delete comprovantes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'comprovantes'
);

-- Policy 4: Allow public (unauthenticated) users to view files (for easy access)
CREATE POLICY "Public can view comprovantes"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'comprovantes'
);
