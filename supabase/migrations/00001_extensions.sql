-- ============================================================
-- MOSJID.INFO — Migration 00001: Extensions
-- Enable required PostgreSQL extensions
-- ============================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Trigram similarity for fuzzy search (Bangla + English)
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Unaccent for normalized search
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;
