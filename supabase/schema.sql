-- MediSave Supabase Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  preferred_lang TEXT DEFAULT 'hi' CHECK (preferred_lang IN ('hi', 'en')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to create profile automatically on auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Prescriptions / Saved Medicines Table
CREATE TABLE IF NOT EXISTS public.saved_prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  ja_code INTEGER NOT NULL,
  pack_count INTEGER DEFAULT 1 NOT NULL,
  brand_mrp NUMERIC(10, 2) NOT NULL,
  generic_equivalent_price NUMERIC(10, 2),
  saving_amount NUMERIC(10, 2),
  molecules TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  form TEXT,
  data_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, NOW()) NOT NULL
);

-- Enable RLS for saved prescriptions
ALTER TABLE public.saved_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved medicines"
  ON public.saved_prescriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add medicines to their list"
  ON public.saved_prescriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved medicines"
  ON public.saved_prescriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON public.saved_prescriptions(user_id);
