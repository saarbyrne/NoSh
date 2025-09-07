-- Create photo_items table
CREATE TABLE IF NOT EXISTS photo_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  raw_label TEXT NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  packaged BOOLEAN DEFAULT FALSE,
  taxonomy_category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE photo_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (through photos table)
CREATE POLICY "Users can view own photo items" ON photo_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_items.photo_id 
      AND photos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own photo items" ON photo_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_items.photo_id 
      AND photos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own photo items" ON photo_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_items.photo_id 
      AND photos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own photo items" ON photo_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_items.photo_id 
      AND photos.user_id = auth.uid()
    )
  );
