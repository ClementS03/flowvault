-- Migration 2026-04-05: Add moderation columns to components
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moderation_note text DEFAULT NULL;

-- Valid values for moderation_status:
--   NULL           → never moderated (default for all existing components)
--   'pending_review' → user re-submitted after a rejection, awaiting admin review
--   'rejected'     → admin unpublished the component
--   'approved'     → admin explicitly approved (after pending_review)

-- Index for the admin queue query
CREATE INDEX IF NOT EXISTS components_moderation_status_idx
  ON public.components (moderation_status)
  WHERE moderation_status IS NOT NULL;
