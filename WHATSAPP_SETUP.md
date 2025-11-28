# WhatsApp Integration Setup Guide

This guide walks you through setting up WhatsApp notifications and conversational AI for NoSh.

## 📋 Prerequisites

- Supabase project deployed (✅ Done)
- Twilio account (free tier works!)
- WhatsApp-enabled phone number

---

## 🚀 Step-by-Step Setup

### 1. Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for free account
3. Navigate to **Console → Develop → Messaging → Try it out → Send a WhatsApp message**
4. Note your **WhatsApp Sandbox Number** (e.g., `+1 415 523 8886`)

### 2. Get Twilio Credentials

From Twilio Console → Account:
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token**: Click to reveal token

### 3. Deploy Database Schema

```bash
# Deploy WhatsApp tables migration
npx supabase db push --linked
```

This creates:
- `whatsapp_subscriptions` - User phone numbers and preferences
- `whatsapp_conversations` - Message history for AI context

### 4. Set Twilio Environment Secrets

```bash
# Set Twilio credentials as Supabase secrets
npx supabase secrets set --project-ref hbryhtpqdgmywrnapaaf \
  TWILIO_ACCOUNT_SID="your_account_sid" \
  TWILIO_AUTH_TOKEN="your_auth_token" \
  TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

Or set via Dashboard:
1. Go to https://supabase.com/dashboard/project/hbryhtpqdgmywrnapaaf/settings/functions
2. Add secrets:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER` (with `whatsapp:` prefix)

### 5. Deploy Edge Functions

```bash
# Deploy all 3 WhatsApp functions
npx supabase functions deploy whatsapp-webhook --project-ref hbryhtpqdgmywrnapaaf --no-verify-jwt
npx supabase functions deploy send-whatsapp-message --project-ref hbryhtpqdgmywrnapaaf --no-verify-jwt
npx supabase functions deploy notify-goals-via-whatsapp --project-ref hbryhtpqdgmywrnapaaf --no-verify-jwt
```

### 6. Configure Twilio Webhook

1. Get your webhook URL:
   ```
   https://hbryhtpqdgmywrnapaaf.supabase.co/functions/v1/whatsapp-webhook
   ```

2. In Twilio Console → Messaging → Settings → WhatsApp Sandbox Settings:
   - **When a message comes in**: Paste your webhook URL
   - **Method**: POST

3. Click **Save**

### 7. Test the Integration

#### A. Subscribe via Web App

1. Navigate to http://localhost:3000/settings/whatsapp
2. Enter your phone number (with country code, e.g., `+12345678900`)
3. Click "Enable WhatsApp Notifications"

#### B. Join Twilio Sandbox

Send this message to the Twilio sandbox number:
```
join NoSh
```

You should receive a confirmation from Twilio.

#### C. Test Commands

Send to the Twilio WhatsApp number:
```
help
```

You should receive the command menu.

---

## 🎯 How It Works

### User Flow

```
1. User uploads 3+ photos
2. Generate goals (via web app)
3. Goals automatically sent to WhatsApp (if subscribed)
4. User can reply with questions
5. AI responds with personalized nutrition context
```

### Architecture

```
WhatsApp Message
    ↓
Twilio API
    ↓
whatsapp-webhook (Edge Function)
    ↓
├─ Store message in DB
├─ Get user context (goals, patterns, history)
├─ Call Gemini AI with context
└─ Send TwiML response
    ↓
Twilio sends reply to user
```

---

## 💬 Available Commands

Users can send these commands via WhatsApp:

- `help` - Show command menu
- `goals` - View current nutrition goals
- `stats` - See eating patterns (coming soon)
- Or just ask natural language questions!

### Example Conversations

**User**: "goals"
**NoSh**:
```
🎯 Your Nutrition Goals

1. Reduce Added Sugar
💡 Why: You consumed high sugar on 8/10 days
✅ How: Swap sodas for water, limit desserts to weekends

2. Increase Whole Foods
...
```

**User**: "Why should I reduce sugar?"
**NoSh**: "You've been having high sugar intake on most days this month. Cutting back can help stabilize your energy levels and reduce cravings! Try swapping sweet drinks for water or tea. 🍵"

---

## 🔧 Advanced Features

### Automatic Goal Notifications

When goals are generated, automatically send to WhatsApp:

```typescript
// In your goal generation flow (web app or edge function)
const { data, error } = await supabase.functions.invoke('notify-goals-via-whatsapp', {
  body: { goal_set_id: 'uuid-of-goal-set' }
});
```

### Weekly Check-ins (Coming Soon)

Set up a cron job to send weekly progress updates:

```sql
-- In Supabase Dashboard → Database → Extensions → pg_cron
SELECT cron.schedule(
  'weekly-whatsapp-checkin',
  '0 9 * * 1', -- Every Monday at 9 AM
  $$
  SELECT net.http_post(
    url:='https://hbryhtpqdgmywrnapaaf.supabase.co/functions/v1/send-weekly-checkins',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  );
  $$
);
```

---

## 🐛 Troubleshooting

### Messages not being received

1. Check Twilio webhook is configured correctly
2. Verify edge function logs: https://supabase.com/dashboard/project/hbryhtpqdgmywrnapaaf/logs/edge-functions
3. Ensure user has active subscription in `whatsapp_subscriptions` table

### AI responses not working

1. Check `GEMINI_API_KEY` is set in edge function secrets
2. Verify user has data (goals, month summaries) in database
3. Check conversation history in `whatsapp_conversations` table

### Webhook signature verification (Production)

For production, add signature verification:

```typescript
// In whatsapp-webhook/index.ts
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

function verifyTwilioSignature(signature: string, url: string, params: any) {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const data = Object.keys(params).sort().map(key => `${key}${params[key]}`).join('');
  const expectedSignature = createHmac('sha1', authToken)
    .update(url + data)
    .digest('base64');
  return signature === expectedSignature;
}
```

---

## 💰 Cost Estimate

### Twilio WhatsApp Pricing (Pay-as-you-go)

- **Inbound messages**: Free
- **Outbound messages**: ~$0.005 per message
- **Monthly estimate** (for 10 active users):
  - 10 users × 4 goal notifications/month = 40 messages
  - 10 users × 4 weekly check-ins = 40 messages
  - ~50 conversational messages
  - **Total**: ~130 messages = **$0.65/month**

### Free Tier

Twilio gives **$15.50 trial credit** = ~3,100 messages for testing!

---

## 📱 Production Checklist

Before launching to users:

- [ ] Deploy WhatsApp migration
- [ ] Deploy all 3 edge functions
- [ ] Set Twilio secrets in production
- [ ] Configure Twilio webhook URL
- [ ] Test end-to-end flow with real phone
- [ ] Add WhatsApp settings page to navigation
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Upgrade from Twilio sandbox to production WhatsApp number
- [ ] Add webhook signature verification
- [ ] Set up cron jobs for weekly check-ins

---

## 🎉 Next Steps

1. **Photo uploads via WhatsApp**: Users can send food photos directly through WhatsApp
2. **Voice messages**: Process voice notes asking questions
3. **Meal suggestions**: AI suggests meals based on patterns
4. **Streaks & gamification**: "You've logged 7 days in a row! 🔥"
5. **Friend challenges**: Compare progress with friends

---

## 📚 Resources

- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Gemini API Documentation](https://ai.google.dev/docs)
