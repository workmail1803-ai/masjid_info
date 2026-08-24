-- ============================================================
-- MOSJID.INFO — Migration 00001: Extensions
-- Enable required PostgreSQL extensions
-- ============================================================

-- UUID generation (using gen_random_uuid() built into PG 13+, no extension needed)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigram similarity for fuzzy search (Bangla + English)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Unaccent for normalized search
CREATE EXTENSION IF NOT EXISTS unaccent;
