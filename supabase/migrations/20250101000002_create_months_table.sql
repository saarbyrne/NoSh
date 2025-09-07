-- Create months table
CREATE TABLE IF NOT EXISTS months (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_ym TEXT NOT NULL, -- Format: YYYY-MM
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_ym)
);

-- Enable RLS
ALTER TABLE months ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own months" ON months
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own months" ON months
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own months" ON months
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own months" ON months
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_months_updated_at
  BEFORE UPDATE ON months
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
