-- SQL Schema for DaySync in Supabase

-- ─── 1. Student Profiles Table ────────────────────────────────────────────────
-- Stores authenticated student academic preferences and derived identity.
-- Synchronized with auth.users via Supabase Auth & Google OAuth.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'B',
  program TEXT NOT NULL DEFAULT 'CS AI',
  year TEXT NOT NULL DEFAULT '1st',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookup by user id and email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view only their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- RLS Policy: Authenticated users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- RLS Policy: Authenticated users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ─── 2. Timetable Records Table ──────────────────────────────────────────────
-- Table: timetable_records

CREATE TABLE IF NOT EXISTS timetable_records (
  id TEXT PRIMARY KEY,
  year TEXT NOT NULL DEFAULT '1st',
  program TEXT NOT NULL DEFAULT 'CS AI',
  "group" TEXT NOT NULL,
  day_of_week INT NOT NULL,
  day_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher TEXT,
  room TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('class', 'lunch', 'free')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries by academic profile and day
CREATE INDEX IF NOT EXISTS idx_timetable_lookup 
ON timetable_records (year, program, "group", day_of_week);

CREATE INDEX IF NOT EXISTS idx_timetable_day 
ON timetable_records (day_of_week);

-- Enable RLS on timetable records (readable by all authenticated users)
ALTER TABLE timetable_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to timetable_records"
ON timetable_records FOR SELECT
TO authenticated, anon
USING (true);
