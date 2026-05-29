# AetherScrape - Enterprise Lead Intelligence Platform

AetherScrape is an advanced Next.js application designed to locate, scrape, and organize enterprise contact credentials and professional profile intelligence in real-time. Built with a responsive dark interface and a robust dual-database system, it empowers growth, sales, and technology teams to generate validated B2B pipeline contacts.

---

## Key Features

- **LinkedIn Profile Scraper**:
  - Leverages Google cache index queries to extract real-world professional profiles.
  - Multi-tier crawling engine:
    1. **ScraperAPI Structured Google Search** (Primary, bypassing search limits).
    2. **SerpAPI Engine** (Secondary live fallback).
    3. **DuckDuckGo HTML Parser** (Keyless free fallback).
    4. **Offline Sandbox Generation** (Offline testing mode).
  - Dynamically synthesizes profile titles, company details, realistic B2B emails, social networks, and target skills.

- **Website Contact Crawler**:
  - Traverses specified domains with configurable recursive crawl depths.
  - Focuses on high-yield team, about, contact, and legal subpages.
  - Parses raw HTML via Axios and Cheerio to extract validated corporate emails, telephone numbers, and social media handles.

- **Real-Time Terminal Console**:
  - Streamed system logging simulator displaying server events, query execution, crawling stages, proxy rotations, and extraction statistics line-by-line.

- **Leads Database & Control Room**:
  - Unified view of all scraped lead profiles.
  - Dynamic filtering by role designation, location region, industry, company size, and keywords.
  - One-click CSV database export.
  - Interactive profile details modal displaying all harvested metadata.

- **Search Run History**:
  - Keeps chronological track of past scraping configurations, total results returned, and system status logs.

- **Dual-Database Architecture**:
  - Auto-detects configuration environment: boots in standard Firestore DB mode when real credentials are present, or switches to a sandboxed client-side LocalStorage DB mode for instant offline testing.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime Logic**: React 19, TypeScript
- **Styling**: Modern CSS variables, glassmorphic dark theme, responsive grid layouts
- **Libraries**: Axios, Cheerio, Lucide Icons
- **Database/Auth**: Firebase (Authentication & Firestore) with client LocalStorage fallback

---

## Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) (v18 or higher) and `npm` installed.

### 2. Environment Setup
Configure your environment variables by editing the `.env.local` file in the project root:

```env
# Firebase Configurations (Optional, defaults to LocalStorage Sandbox if blank)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Scraper API Key (For Live Google Cache LinkedIn crawler)
SCRAPERAPI_API_KEY=44a30fecb89ad9db0bac32313fa45a64

# SerpAPI Key (Fallback Google Cache LinkedIn crawler)
SERPAPI_API_KEY=your_serpapi_api_key
```

### 3. Installation
Install all dependencies:
```bash
npm install
```

### 4. Running the Development Server
Launch the local Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the dashboard and begin scraping leads.

### 5. Production Build
To create a production-optimized build of the application:
```bash
npm run build
npm run start
```
