-- Create goal_sets table
CREATE TABLE IF NOT EXISTS goal_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_ym TEXT NOT NULL, -- Format: YYYY-MM
  goals JSONB NOT NULL, -- Array of 3 goals with title, why, how, fallback
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_ym)
);

-- Enable RLS
ALTER TABLE goal_sets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own goal sets" ON goal_sets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal sets" ON goal_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal sets" ON goal_sets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal sets" ON goal_sets
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_goal_sets_updated_at
  BEFORE UPDATE ON goal_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
