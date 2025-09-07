-- Add photo_analysis_consent column to profiles table
ALTER TABLE profiles 
ADD COLUMN photo_analysis_consent BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN profiles.photo_analysis_consent IS 'User consent for automatic AI analysis of food photos';
