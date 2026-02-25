-- Migration: Add Subscription & Billing Tables
-- Created: 2026-02-16
-- Description: Adds user-level subscription billing with Paymob integration

-- =====================================================
-- 1. Add billing columns to organizations table
-- =====================================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS paymob_customer_id TEXT,
ADD COLUMN IF NOT EXISTS paymob_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS user_subscription_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS user_monthly_price_piasters INTEGER,
ADD COLUMN IF NOT EXISTS user_annual_price_piasters INTEGER,
ADD COLUMN IF NOT EXISTS user_currency VARCHAR(3) DEFAULT 'EGP';

-- =====================================================
-- 2. Create subscription status enums
-- =====================================================

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. Create promo_codes table
-- =====================================================

CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    trial_days INTEGER NOT NULL DEFAULT 30,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for promo_codes
CREATE UNIQUE INDEX IF NOT EXISTS promo_code_org_idx ON promo_codes(code, organization_id);
CREATE INDEX IF NOT EXISTS promo_code_org_lookup_idx ON promo_codes(organization_id);
CREATE INDEX IF NOT EXISTS promo_code_active_idx ON promo_codes(is_active);

-- =====================================================
-- 4. Create user_subscriptions table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Paymob references
    paymob_order_id TEXT,
    paymob_transaction_id TEXT,
    
    -- Promo code used
    promo_code_id TEXT REFERENCES promo_codes(id) ON DELETE SET NULL,
    
    -- Status & billing
    status subscription_status NOT NULL DEFAULT 'trialing',
    billing_cycle VARCHAR(10),
    amount_piasters INTEGER,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- Trial tracking
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    
    -- Billing period
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    
    -- Metadata
    canceled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for user_subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS user_sub_user_org_idx ON user_subscriptions(user_id, organization_id);
CREATE INDEX IF NOT EXISTS user_sub_org_idx ON user_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS user_sub_status_idx ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS user_sub_trial_end_idx ON user_subscriptions(trial_end);

-- =====================================================
-- 5. Create payments table
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_subscription_id TEXT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    
    -- Paymob details
    paymob_order_id TEXT,
    paymob_transaction_id TEXT,
    
    -- Payment info
    amount_piasters INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    description TEXT,
    
    -- Timestamps
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS payment_org_idx ON payments(organization_id);
CREATE INDEX IF NOT EXISTS payment_user_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payment_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payment_paymob_order_idx ON payments(paymob_order_id);

-- =====================================================
-- 6. Add comments for documentation
-- =====================================================

COMMENT ON TABLE promo_codes IS 'Promotional codes for free trial activation (30-day no-credit-card trials)';
COMMENT ON TABLE user_subscriptions IS 'User-level (B2C) subscriptions within organizations';
COMMENT ON TABLE payments IS 'Payment history for both organization-level and user-level billing';

COMMENT ON COLUMN organizations.user_subscription_enabled IS 'Whether this org requires per-user subscriptions (B2C model)';
COMMENT ON COLUMN organizations.user_monthly_price_piasters IS 'Monthly subscription price in piasters (1 EGP = 100 piasters)';
COMMENT ON COLUMN organizations.user_annual_price_piasters IS 'Annual subscription price in piasters (per month)';

COMMENT ON COLUMN user_subscriptions.status IS 'Subscription status: trialing (free trial), active (paid), past_due, canceled, expired';
COMMENT ON COLUMN user_subscriptions.billing_cycle IS 'monthly or annual';
COMMENT ON COLUMN user_subscriptions.amount_piasters IS 'Price locked at subscription time in piasters';

COMMENT ON COLUMN payments.amount_piasters IS 'Payment amount in piasters (1 EGP = 100 piasters)';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, succeeded, failed, refunded';
