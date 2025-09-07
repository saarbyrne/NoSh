-- Create day_summaries table
CREATE TABLE IF NOT EXISTS day_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  totals JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE day_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own day summaries" ON day_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day summaries" ON day_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day summaries" ON day_summaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own day summaries" ON day_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_day_summaries_updated_at
  BEFORE UPDATE ON day_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
