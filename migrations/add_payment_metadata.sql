-- Add metadata column to payments table for storing registration retry data
-- Migration: add_payment_metadata
-- Created: 2026-02-17

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add comment to document the column purpose
COMMENT ON COLUMN payments.metadata IS 'Stores registration data for payment retry functionality and additional payment context';
