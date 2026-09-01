# 🌅 DaySync 1.0

> **Smart Daily Academic Timetable & Class Tracker for SST Scaler Students**  
> Your schedule, classrooms, instructors, and real-time next-class alerts—crafted with an Apple-grade tactile experience.

---

## ✨ Highlights & Features

- 🎯 **Tailored for SST Scaler**: Automated schedules and matrix parsing for CS AI (Year 1, Groups A, B, C, and D).
- ☕ **Apple-Grade Visual Design**: Frosted glassmorphism, minimal silver glowing CTAs, tactile spring physics, and fluid warm mocha droplet ripples.
- 🔔 **Real-Time Next Class Notifications**: Instant updates on your upcoming lecture, room location, and live countdown timer.
- 🔒 **Google OAuth & Domain Protection**: Strict domain-level validation restricted to authorized `@sst.scaler.com` accounts.
- 📱 **Mobile-First & PWA-Ready**: Smooth responsive layout, service worker offline capabilities, and reversible ambient background animations.

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/harshwardhanchouhan/DaySync.git
cd DaySync
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Vanilla CSS Design System with Apple Human Interface spring dynamics & glassmorphism
- **Backend & Auth**: Supabase (PostgreSQL, Realtime, OAuth 2.0)
- **Tooling**: Oxlint, TypeScript Compiler, PWA Service Worker

---

## 📄 License

MIT © [Harshwardhan Chouhan](https://github.com/harshwardhanchouhan)
