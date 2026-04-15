-- Migration: 2026-04-15-page-templates-kits
-- Run this in the Supabase Dashboard → SQL Editor

-- 1. Add type column to components
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'component';
-- Allowed values: 'component' | 'page_template'

-- 2. Create kits table
CREATE TABLE IF NOT EXISTS public.kits (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  description text,
  slug        text UNIQUE NOT NULL,
  is_public   boolean DEFAULT false,
  copy_count  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kits"
  ON public.kits FOR SELECT USING (is_public = true);
CREATE POLICY "Own read kits"
  ON public.kits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own insert kits"
  ON public.kits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own update kits"
  ON public.kits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own delete kits"
  ON public.kits FOR DELETE USING (auth.uid() = user_id);

-- 3. Create kit_components pivot table
CREATE TABLE IF NOT EXISTS public.kit_components (
  kit_id       uuid REFERENCES public.kits ON DELETE CASCADE NOT NULL,
  component_id uuid REFERENCES public.components ON DELETE CASCADE NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (kit_id, component_id)
);

ALTER TABLE public.kit_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kit_components"
  ON public.kit_components FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.is_public = true
  ));
CREATE POLICY "Own read kit_components"
  ON public.kit_components FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
CREATE POLICY "Own insert kit_components"
  ON public.kit_components FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
CREATE POLICY "Own delete kit_components"
  ON public.kit_components FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
