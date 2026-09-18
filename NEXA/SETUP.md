# 🚀 NEXA Setup & Deployment Guide

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Git installed
- ✅ GitHub account (already connected ✓)
- ✅ MongoDB Atlas account (free tier available)
- ✅ OpenAI API key
- ✅ Vercel account (optional, for deployment)

---

## 🔧 Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/Cedrick-KC/NEXA.git
cd NEXA

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

---

## 🔐 Step 2: Environment Configuration

### **Backend Environment (.env)**

Create `backend/.env`:

```env
# Core
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database - IMPORTANT: Set up MongoDB
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/nexa

# Authentication
JWT_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# OpenAI - REQUIRED
OPENAI_API_KEY=sk-your_openai_api_key_here

# GitHub - REQUIRED (for project tracking)
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Web Search (choose one)
SERPER_API_KEY=your_serper_key
# OR
SERPAPI_KEY=your_serpapi_key
```

### **Frontend Environment (.env.local)**

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=same_as_backend

# GitHub OAuth (for auth)
GITHUB_ID=your_github_oauth_client_id
GITHUB_SECRET=your_github_oauth_client_secret
```

---

## 📊 Step 3: Set Up MongoDB

### **Option A: MongoDB Atlas (Recommended)**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 free tier)
4. Create database user
5. Whitelist your IP (or use 0.0.0.0/0 for development)
6. Get connection string
7. Replace in `.env` → `MONGODB_URI`

### **Option B: Local MongoDB**

```bash
# Install MongoDB locally
brew install mongodb-community  # macOS
# or
sudo apt-get install mongodb     # Linux

# Start MongoDB
mongod --dbpath /path/to/data

# Connection string
MONGODB_URI=mongodb://localhost:27017/nexa
```

---

## 🔑 Step 4: Get API Keys

### **OpenAI API Key** (Required)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / Login
3. Go to API Keys
4. Create new secret key
5. Copy to `.env` → `OPENAI_API_KEY`

**Cost:** ~$0.01-0.10 per request (GPT-4)

### **GitHub Personal Access Token** (Required)

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`, `read:org`
4. Copy to `.env` → `GITHUB_TOKEN`

### **Web Search API** (Required for Opportunity Agent)

**Option A: Serper.dev (Recommended - Free tier)**
1. Go to [serper.dev](https://serper.dev)
2. Sign up
3. Get API key
4. Copy to `.env` → `SERPER_API_KEY`

**Option B: SerpAPI**
1. Go to [serpapi.com](https://serpapi.com)
2. Sign up for free tier
3. Get API key
4. Copy to `.env` → `SERPAPI_KEY`

---

## 🏃 Step 5: Run Development Servers

### **Terminal 1: Backend**
```bash
cd backend
npm run dev
```
Backend runs on: `http://localhost:3001`

### **Terminal 2: Frontend**
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:3000`

### **Or run both simultaneously from root:**
```bash
npm run dev
```

---

## 🧪 Step 6: Test the System

1. **Open browser:** `http://localhost:3000`
2. **Login with GitHub**
3. **Test chat:** "Find scholarships for me"
4. **Check dashboard:** Should show your GitHub projects

---

## 🚀 Step 7: Deploy to Production

### **Frontend: Vercel** (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel

# Follow prompts
# Set environment variables in Vercel dashboard
```

**Environment variables to set in Vercel:**
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GITHUB_ID`
- `GITHUB_SECRET`

### **Backend: Railway / Render / Heroku**

#### **Railway (Easiest)**

1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Select `NEXA/backend` folder
4. Add environment variables
5. Deploy

#### **Render**

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect repository
4. Root directory: `backend`
5. Build command: `npm install && npm run build`
6. Start command: `npm start`
7. Add environment variables

### **MongoDB Atlas Connection**

For production, update MongoDB whitelist:
1. Go to Atlas → Network Access
2. Add your server's IP
3. Or add 0.0.0.0/0 (less secure)

---

## 🗄️ Database Collections

NEXA will auto-create these collections:

```
nexa/
├── users
├── goals
├── projects
├── tasks
├── opportunities
├── applications
├── businesses
├── documents
├── events
├── notifications
├── agent_runs
└── memories
```

---

## 🔄 Proactive Mode Setup

### **Enable Scheduled Discovery**

Edit `backend/src/index.ts`:

```typescript
import cron from 'node-cron';
import { NexaOrchestrator } from './orchestrator/NexaOrchestrator';

const orchestrator = new NexaOrchestrator();

// Run every Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  console.log('Running weekly opportunity discovery...');
  await orchestrator.proactiveDiscovery(userId);
});

// Run daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily deadline check...');
  // Check deadlines
});
```

---

## 📱 Access Points

After deployment:

- **Dashboard:** `https://your-app.vercel.app/dashboard`
- **Chat:** `https://your-app.vercel.app/chat`
- **Opportunities:** `https://your-app.vercel.app/opportunities`
- **Projects:** `https://your-app.vercel.app/projects`
- **Tasks:** `https://your-app.vercel.app/tasks`

---

## 🐛 Troubleshooting

### **MongoDB Connection Failed**
```
Error: MongooseServerSelectionError
```
**Fix:** Check MongoDB URI, whitelist IP, verify credentials

### **OpenAI API Error**
```
Error: 401 Unauthorized
```
**Fix:** Verify OPENAI_API_KEY is correct, check billing

### **GitHub Integration Not Working**
```
Error: Bad credentials
```
**Fix:** Regenerate GitHub token with correct scopes

### **Port Already in Use**
```
Error: EADDRINUSE
```
**Fix:** Kill process or change port:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Change all default secrets
- [ ] Use environment variables (never commit `.env`)
- [ ] Enable CORS restrictions
- [ ] Set up rate limiting
- [ ] Enable HTTPS only
- [ ] Restrict MongoDB access
- [ ] Rotate API keys regularly
- [ ] Enable GitHub OAuth properly

---

## 📈 Monitoring

### **Logs**

Backend logs are in:
```bash
backend/logs/
├── error.log
├── combined.log
└── info.log
```

### **Health Check**

```bash
# Check backend health
curl http://localhost:3001/health

# Check database connection
curl http://localhost:3001/api/health/db
```

---

## 🎯 Next Steps

1. ✅ Complete setup
2. ✅ Test locally
3. ✅ Deploy to production
4. ✅ Configure proactive mode
5. ✅ Add your goals & profile
6. ✅ Let NEXA discover opportunities
7. ✅ Track your projects
8. ✅ Build your future

---

## 💬 Support

Issues? Questions?

- GitHub Issues: [github.com/Cedrick-KC/NEXA/issues](https://github.com/Cedrick-KC/NEXA/issues)
- Documentation: `/docs`

---

**Built by Cedrick KC**

*NEXA: Your AI-powered command center for opportunities, projects, and growth.*
