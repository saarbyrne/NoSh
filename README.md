# NoSh - Food Photo → Rules → 3 Goals

A Progressive Web App (PWA) that analyzes food photos using AI to generate personalized nutrition goals.

## 🎯 Overview

NoSh is an MVP web application where users upload photos of their meals over 3 days. The backend processes each photo using Gemini Vision AI, maps food items to a fixed taxonomy, applies deterministic rules, and generates 3 personalized nutrition goals using an LLM.

## 🏗️ Architecture

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **PWA** with manifest and service worker (Workbox)

### Backend
- **Supabase** for authentication, database, and storage
- **Edge Functions** for serverless processing
- **PostgreSQL** with Row Level Security (RLS)

### AI/ML
- **Gemini 1.5 Flash** for vision and OCR
- **OpenAI** as optional fallback
- **Zod** for JSON validation

### Deployment
- **Vercel** for frontend hosting
- **Supabase** manages functions and database

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x
- Supabase account
- Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NoSh
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install web app dependencies
   cd web
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Edit .env.local with your actual values
   ```

4. **Database Setup**
   ```bash
   # Start Supabase locally (optional)
   npx supabase start
   
   # Run migrations
   npx supabase db push
   ```

5. **Start Development Server**
   ```bash
   cd web
   npm run dev
   ```

## 📁 Project Structure

```
NoSh/
├── web/                          # Next.js frontend application
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── (auth)/           # Authentication pages
│   │   │   ├── (app)/            # Main application pages
│   │   │   └── api/              # API routes
│   │   ├── components/           # React components
│   │   ├── lib/                  # Utility libraries
│   │   └── server/               # Server-side logic
│   └── public/                   # Static assets
├── supabase/                     # Supabase configuration
│   ├── functions/                # Edge Functions
│   └── migrations/               # Database migrations
├── mapping/                      # Food taxonomy and mapping
├── Documents/                    # Project documentation
└── .env.example                  # Environment variables template
```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | ❌ |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_STORAGE_BUCKET` | Storage bucket name | `photos` |

## 🗄️ Database Schema

The application uses 8 main tables:

- **profiles** - User information
- **months** - Monthly tracking periods
- **photos** - Uploaded food photos
- **photo_items** - AI-analyzed food items
- **day_summaries** - Daily nutrition summaries
- **month_summaries** - Monthly pattern analysis
- **goal_sets** - Generated nutrition goals
- **goal_feedback** - User feedback on goals

All tables implement Row Level Security (RLS) with `user_id = auth.uid()` policies.

## 🤖 AI Pipeline

### Photo Analysis Flow
1. User uploads photo via PWA
2. Edge function calls Gemini Vision API
3. AI extracts food items and confidence scores
4. Items mapped to fixed taxonomy using `label_map.csv`
5. Deterministic rules applied to generate pattern flags
6. Monthly summary created with pattern analysis

### Goal Generation
1. Month summary data sent to LLM
2. AI generates 3 personalized nutrition goals
3. JSON output validated with Zod schemas
4. Goals stored for user acceptance/editing

## 📱 PWA Features

- **Installable** - Users can install as native app
- **Offline Support** - Basic functionality works offline
- **Push Notifications** - Goal reminders (planned)
- **Camera Integration** - Direct photo capture

## 🧪 Testing

```bash
# Run linting
cd web
npm run lint

# Run type checking
npm run build
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Deploy to Vercel
vercel --prod
```

### Backend (Supabase)
```bash
# Deploy edge functions
npx supabase functions deploy

# Deploy database migrations
npx supabase db push
```

## 📊 Progress Status

- **Database & Infrastructure**: ✅ 100% Complete
- **AI/ML Pipeline**: ✅ 90% Complete
- **Frontend Components**: ⚠️ 80% Complete
- **Core Functionality**: ⚠️ 70% Complete
- **UI/UX Polish**: ⚠️ 40% Complete
- **Testing & Quality**: ❌ 0% Complete
- **Deployment**: ⚠️ 20% Complete

See [PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md) for detailed status.

## 🔒 Privacy & Security

- **Photo Deletion**: Original photos deleted after 30 days
- **RLS Policies**: Users can only access their own data
- **Magic Link Auth**: No passwords stored
- **Private Storage**: Photos stored in private Supabase bucket

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For issues and questions:
1. Check the [PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md)
2. Review the [Documents](./Documents/) folder
3. Create an issue in the repository

---

**Last Updated**: January 2025
**Version**: MVP 0.1.0
