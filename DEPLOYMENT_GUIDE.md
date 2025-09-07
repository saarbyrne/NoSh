# NoSh MVP Deployment Guide

## 🚀 What's Been Completed

### ✅ Database & Infrastructure
- **Database migrations created** for all required tables:
  - `profiles`, `months`, `photos`, `photo_items`
  - `day_summaries`, `month_summaries`, `goal_sets`, `goal_feedback`
- **Row Level Security (RLS) policies** implemented for all tables
- **Storage bucket configuration** for private photo storage
- **All edge functions created**:
  - `process-photo` - Orchestrates photo analysis pipeline
  - `delete-old-photos` - Scheduled cleanup (30 days)
  - `submit-feedback` - Goal feedback collection
  - Updated `summarize-month` with pattern flags generation

### ✅ AI/ML Pipeline
- **Gemini AI module** (`web/src/server/ai/gemini.ts`) with:
  - `analyzeImage()` function with strict JSON validation
  - `generateGoals()` function with retry logic
  - Proper error handling and Zod validation
- **OpenAI fallback module** (`web/src/server/ai/openai.ts`)
- **Pattern flags integration** in summarize-month function
- **Zod validation** for all AI outputs

### ✅ Frontend Components
- **BottomNavigation component** with 4 tabs (Add Meals, Calendar, Goals, Settings)
- **Header component** for consistent app header
- **Settings page** with user preferences and account management
- **App layout integration** with BottomNavigation
- **Complete API integration** (`web/src/lib/api.ts`) with all edge function calls

## 📋 Next Steps for Deployment

### 1. Database Setup
```bash
# Run migrations on your Supabase project
supabase db push --project-ref hbryhtpqdgmywrnapaaf
```

### 2. Deploy Edge Functions
```bash
# Deploy all edge functions
supabase functions deploy create-upload-url --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy process-photo --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy analyze-photo --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy save-photo-items --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy summarize-day --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy summarize-month --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy generate-goals --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy submit-goals --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy submit-feedback --project-ref hbryhtpqdgmywrnapaaf
supabase functions deploy delete-old-photos --project-ref hbryhtpqdgmywrnapaaf
```

### 3. Environment Variables
Add to your `.env.local`:
```bash
# You already have these:
NEXT_PUBLIC_SUPABASE_URL=https://hbryhtpqdgmywrnapaaf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=z2IhkAMA4YRXqZe8U1SDNFZm63pTCjwaFRl7UwTF8od6UmYrVJQXcRvf4CpJrJcEtCmbWWyCSmxXzKdLhh4ylA==
AI_PROVIDER=gemini

# You need to add these:
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here (optional)
```

### 4. Set Up Scheduled Functions
In your Supabase dashboard:
1. Go to Database → Functions
2. Create a new function for `delete-old-photos`
3. Set up a cron job to run daily

### 5. Test the Pipeline
```bash
# Test photo upload and analysis
curl -X POST http://localhost:3000/api/test-upload

# Test goal generation
curl -X POST http://localhost:3000/api/test-goals
```

## 🔧 Remaining Tasks (High Priority)

### 1. Complete GoalsView Component
- Goal acceptance/editing functionality
- Goal feedback collection
- Integration with goal generation API

### 2. Complete Photo Upload Flow
- Error handling and progress indicators
- Integration with process-photo function
- Proper loading states

### 3. Complete Day/Month Summary Components
- Data display and navigation
- Pattern flags visualization
- Goal generation triggers

### 4. Privacy & Data Consent
- GDPR compliance flow
- Data export functionality
- Privacy policy integration

## 🎯 Definition of Done Checklist

- [ ] End-to-end flow working with 1 real user
- [ ] p95 photo processing < 10s
- [ ] Zod validation passing
- [ ] RLS verified
- [ ] Photos deleted after 30 days
- [ ] Lighthouse PWA: installable ✅

## 🚨 Critical Dependencies

1. **GEMINI_API_KEY** - Required for photo analysis and goal generation
2. **SUPABASE_SERVICE_ROLE_KEY** - Required for edge functions
3. **Database migrations** - Must be run before testing
4. **Edge function deployment** - Required for core functionality

## 📞 Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify environment variables are set correctly
3. Test edge functions individually
4. Check RLS policies are working correctly

The core infrastructure is now complete and ready for deployment!
