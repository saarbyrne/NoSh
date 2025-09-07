-- Create month_summaries table
CREATE TABLE IF NOT EXISTS month_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_ym TEXT NOT NULL, -- Format: YYYY-MM
  totals JSONB DEFAULT '{}',
  pattern_flags JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_ym)
);

-- Enable RLS
ALTER TABLE month_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own month summaries" ON month_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own month summaries" ON month_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own month summaries" ON month_summaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own month summaries" ON month_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_month_summaries_updated_at
  BEFORE UPDATE ON month_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
