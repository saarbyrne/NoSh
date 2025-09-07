-- Create goal_feedback table
CREATE TABLE IF NOT EXISTS goal_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_set_id UUID REFERENCES goal_sets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achieved BOOLEAN,
  liked BOOLEAN,
  repeat_next BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE goal_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own goal feedback" ON goal_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal feedback" ON goal_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal feedback" ON goal_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal feedback" ON goal_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_goal_feedback_updated_at
  BEFORE UPDATE ON goal_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
