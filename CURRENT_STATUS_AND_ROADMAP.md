# NoSh - Current Status & Improvement Roadmap

**Date**: November 28, 2025
**Current State**: Core functionality working, UX needs improvement

---

## ✅ What's Working

### 1. **Authentication & User Management**
- ✅ Magic link login via Supabase Auth
- ✅ Session persistence
- ✅ OAuth callback handling
- ✅ User profile storage with consent tracking

### 2. **Photo Upload & Storage**
- ✅ Photo upload to Supabase Storage
- ✅ Signed URL generation
- ✅ Client-side image preview
- ✅ Multiple photo upload (3+ photos)

### 3. **AI Photo Analysis** (Gemini 2.0 Flash)
- ✅ Photos are sent to analyze-photo edge function
- ✅ AI detects food items in images
- ✅ Returns structured JSON: `{ photo_id, items: [{ raw_label, confidence, packaged }] }`
- ✅ Saves results to `photo_items` table

### 4. **Goal Generation** (Gemini 2.0 Flash)
- ✅ Generates 3 goals per month based on food patterns
- ✅ Uses `month_summaries.totals` data
- ✅ Returns structured goals: `{ title, why, how, fallback }`
- ✅ Can save goals to database

### 5. **Database & RLS**
- ✅ All 10 migrations deployed to production
- ✅ Row Level Security policies working
- ✅ Tables: photos, photo_items, day_summaries, month_summaries, goals

### 6. **UI/UX**
- ✅ Responsive design (mobile-first)
- ✅ Bottom navigation working
- ✅ Consistent page widths (max-w-4xl)
- ✅ Proper spacing to clear bottom nav
- ✅ Clean header (removed redundant elements)

---

## ❌ Critical Gaps & Issues

### 1. **No Photo Analysis Feedback to User**
**Problem**: Users upload photos but never see what the AI detected.

**Impact**:
- Can't verify if classification was correct
- No trust in the system
- Can't correct mistakes

**Solution Needed**:
- Show detected items immediately after upload
- Display confidence scores
- Allow users to edit/correct labels
- Show nutrition data for each item (if available)

**Location**: After photo upload in PhotoUploadForm component

---

### 2. **Poor Goal Quality & Variety**
**Problem**: Goals are generic and repetitive.

**Root Causes**:
- Only using `month_summaries.totals` (aggregated counts)
- Prompt is too simple: "past 3 days in month" is vague
- No user context (preferences, restrictions, past behavior)
- No temporal patterns (breakfast vs dinner habits)

**Current Prompt**:
```
Based on these category totals for the past 3 days in month ${month_ym},
write 3 simple, actionable goals.
```

**Issues with Current Data**:
- `month_summaries.totals` is just category counts: `{"fruit": 5, "vegetable": 3}`
- No timestamps, no meal context, no specific items
- AI has no real patterns to work with

**Solutions Needed**:
1. **Better Data for Goals**:
   - Query actual `photo_items` with timestamps
   - Include specific food labels (not just categories)
   - Calculate temporal patterns (time of day, frequency)
   - Include day_summaries for daily context

2. **Improved Prompt**:
   ```
   You are analyzing ${days} days of food tracking for month ${month_ym}.

   Specific foods consumed:
   - Breakfast: [list actual items with frequency]
   - Lunch: [list actual items]
   - Dinner: [list actual items]
   - Snacks: [list actual items]

   Patterns observed:
   - Missing categories: [e.g., vegetables, fruits]
   - Overconsumed categories: [e.g., processed foods, sweets]
   - Temporal issues: [e.g., late dinners, no breakfast]

   Generate 3 goals that are:
   1. Specific to their actual eating patterns
   2. Realistic and achievable
   3. Varied (not all about the same thing)
   ```

3. **Goal Diversity**:
   - Track previously generated goals to avoid repetition
   - Rotate focus areas (hydration, timing, variety, portions, etc.)
   - Personalize based on user preferences if available

**Location**: `supabase/functions/generate-goals/index.ts`

---

### 3. **No Day Summary Insights**
**Problem**: Day summary page exists but doesn't show meaningful data.

**Missing**:
- Total calories (if calculable)
- Food categories breakdown
- Nutrition highlights (protein, fiber, etc.)
- Comparison to goals
- Photos from that day with detected items

**Location**: `web/src/components/DaySummary.tsx`

---

### 4. **No Month Summary Insights**
**Problem**: Month summary doesn't show progress or trends.

**Missing**:
- Daily averages
- Category trends (eating more/less of X)
- Goal progress tracking
- Visual charts/graphs
- Most common foods

**Location**: `web/src/components/MonthSummaryClient.tsx`

---

## 🔧 Immediate Improvements (Priority Order)

### **Priority 1: Show Photo Analysis Results** ⭐⭐⭐
**Why**: Users need feedback to trust the system.

**Tasks**:
1. Update PhotoUploadForm to display detected items after upload
2. Show confidence scores with visual indicators
3. Add ability to remove incorrect items
4. Style the feedback nicely (cards with food emoji?)

**Effort**: 2-3 hours
**Impact**: High - builds user trust

---

### **Priority 2: Improve Goal Generation** ⭐⭐⭐
**Why**: Goals are the core value proposition.

**Tasks**:
1. Modify generate-goals to query photo_items directly
2. Calculate temporal patterns (breakfast/lunch/dinner)
3. Identify missing categories and overconsumption
4. Improve prompt with specific patterns and examples
5. Add goal diversity logic (track previous goals)

**Effort**: 4-6 hours
**Impact**: Very High - makes goals actually useful

---

### **Priority 3: Build Day Summary Insights** ⭐⭐
**Why**: Users want to see daily progress.

**Tasks**:
1. Query day_summaries for the specific date
2. Show category breakdown
3. Display photos with detected items
4. Add nutrition highlights
5. Compare to daily goals (if set)

**Effort**: 3-4 hours
**Impact**: Medium-High - shows progress

---

### **Priority 4: Build Month Summary Insights** ⭐
**Why**: Users want to see trends over time.

**Tasks**:
1. Query month_summaries and calculate trends
2. Show category changes week-over-week
3. Add simple charts (Chart.js or Recharts)
4. Display goal completion rate
5. Show most/least consumed foods

**Effort**: 4-5 hours
**Impact**: Medium - long-term engagement

---

## 🚀 Future Enhancements (After Core Fixes)

### **Phase 2: Enhanced Tracking**
- Manual food entry (for when photos aren't possible)
- Barcode scanning for packaged foods
- Portion size estimation
- Water intake tracking
- Meal timing recommendations

### **Phase 3: Nutrition Database**
- Integrate USDA FoodData Central API
- Calculate actual calories and macros
- Set daily nutrition targets
- Track micronutrients (vitamins, minerals)

### **Phase 4: Social & Engagement**
- Streaks and achievements
- Weekly recap emails
- Share progress with friends
- Recipe suggestions based on patterns

### **Phase 5: WhatsApp Integration** (Original Request)
- Send goals via WhatsApp
- Log meals via WhatsApp photo
- Daily reminders
- Quick check-ins

---

## 📊 Data Flow Analysis

### Current Flow:
```
1. User uploads photo → Supabase Storage
2. Frontend calls analyze-photo → Gemini 2.0 Flash
3. Gemini returns { items: [...] }
4. ❌ Frontend doesn't save to photo_items (MISSING STEP)
5. ❌ User never sees results
6. User clicks "Finish Day"
7. ❌ Nothing happens (no aggregation logic)
8. User goes to Goals page
9. Frontend calls generate-goals
10. generate-goals queries month_summaries
11. ❌ month_summaries is empty (no aggregation)
12. Gemini generates generic goals with no data
```

### What Should Happen:
```
1. User uploads photo → Supabase Storage ✅
2. Frontend calls analyze-photo → Gemini 2.0 Flash ✅
3. Gemini returns { items: [...] } ✅
4. Frontend saves to photo_items table ✅ (save-photo-items function)
5. Frontend shows detected items to user ❌ MISSING
6. User can edit/confirm items ❌ MISSING
7. User clicks "Finish Day"
8. Frontend triggers aggregation:
   - Update day_summaries for that date
   - Update month_summaries for that month
9. User goes to Goals page
10. generate-goals queries photo_items + day_summaries
11. Calculates real patterns
12. Gemini generates personalized goals
```

---

## 🔍 Missing Pieces Checklist

- [ ] Display photo analysis results to user
- [ ] Save photo analysis to photo_items table (verify this is happening)
- [ ] Aggregate data into day_summaries (missing logic)
- [ ] Aggregate data into month_summaries (missing logic)
- [ ] Improve goal generation prompt
- [ ] Query detailed data for goal generation
- [ ] Build day summary insights UI
- [ ] Build month summary insights UI
- [ ] Add nutrition data enrichment
- [ ] Test complete end-to-end flow

---

## 💡 Recommendations

### **For Next Session:**

1. **Verify Data Flow**
   - Check if photo_items are being saved after upload
   - Check if day_summaries/month_summaries are being populated
   - Review edge function logs for errors

2. **Quick Win: Show Analysis Results**
   - Modify PhotoUploadForm to display detected items
   - This gives immediate user value

3. **Core Fix: Goal Generation**
   - Rewrite generate-goals to use actual food data
   - Test with real uploaded photos

4. **Testing**
   - Upload 5-10 different food photos
   - Verify each step of data flow
   - Generate goals and check quality

### **What NOT to Build Yet:**
- ❌ WhatsApp integration (wait until core UX is solid)
- ❌ Complex nutrition calculations (start simple)
- ❌ Social features (validate single-user experience first)
- ❌ Mobile app (PWA is enough for now)

---

## 🎯 Success Criteria (Next 2 Weeks)

**Week 1:**
- [ ] User sees what AI detected in their photos
- [ ] Goals are specific and varied (not generic)
- [ ] Day summary shows meaningful data
- [ ] Complete data flow working (upload → analysis → aggregation → goals)

**Week 2:**
- [ ] Month summary shows trends
- [ ] Users can track progress toward goals
- [ ] 5 test users try the app and give feedback
- [ ] Decision point: Is this useful enough to add WhatsApp?

---

## 📝 Notes

- **Supabase Costs**: Currently $25/month, minimal usage
- **Gemini API**: Free tier should be sufficient for testing
- **Storage**: Photos auto-delete after 30 days (already configured)
- **Database**: 10 migrations deployed, all RLS policies active
- **UI**: Clean, responsive, mobile-friendly ✅

---

## Questions to Answer

1. **Are photo_items being saved?** (Need to verify in database)
2. **Are day_summaries being populated?** (Likely not - missing logic)
3. **Are month_summaries being populated?** (Likely not - missing logic)
4. **What should day/month aggregation logic look like?** (Need to design)
5. **Should we add manual nutrition entry or focus on AI only?** (Decision needed)
