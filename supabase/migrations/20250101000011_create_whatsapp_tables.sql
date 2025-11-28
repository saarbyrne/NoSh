-- WhatsApp Subscriptions Table
-- Tracks which users are subscribed to WhatsApp notifications
CREATE TABLE IF NOT EXISTS whatsapp_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{
    "goals_notification": true,
    "weekly_checkin": true,
    "daily_reminders": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

-- WhatsApp Conversations Table
-- Stores all WhatsApp message history for context
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  message_sid TEXT, -- Twilio message ID
  message_body TEXT NOT NULL,
  media_url TEXT[], -- Array of media URLs if present
  message_status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
  ai_context JSONB, -- Store conversation context for AI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_whatsapp_subscriptions_user_id ON whatsapp_subscriptions(user_id);
CREATE INDEX idx_whatsapp_subscriptions_phone_active ON whatsapp_subscriptions(phone_number, is_active);
CREATE INDEX idx_whatsapp_conversations_user_id ON whatsapp_conversations(user_id);
CREATE INDEX idx_whatsapp_conversations_created_at ON whatsapp_conversations(created_at DESC);
CREATE INDEX idx_whatsapp_conversations_phone_created ON whatsapp_conversations(phone_number, created_at DESC);

-- Enable RLS
ALTER TABLE whatsapp_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_subscriptions
CREATE POLICY "Users can view own subscriptions" ON whatsapp_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON whatsapp_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON whatsapp_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_conversations
CREATE POLICY "Users can view own conversations" ON whatsapp_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON whatsapp_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can access all (for webhook function)
CREATE POLICY "Service role full access to subscriptions" ON whatsapp_subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to conversations" ON whatsapp_conversations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Updated_at trigger for subscriptions
CREATE TRIGGER update_whatsapp_subscriptions_updated_at
  BEFORE UPDATE ON whatsapp_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get user_id from phone number
CREATE OR REPLACE FUNCTION get_user_id_by_phone(phone TEXT)
RETURNS UUID AS $$
  SELECT user_id
  FROM whatsapp_subscriptions
  WHERE phone_number = phone
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get recent conversation context
CREATE OR REPLACE FUNCTION get_recent_conversation_context(
  p_user_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  direction TEXT,
  message_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
  SELECT direction, message_body, created_at
  FROM whatsapp_conversations
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL SECURITY DEFINER;
