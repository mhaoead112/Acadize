-- Enable user subscriptions for all organizations
-- This ensures that all users must have an active subscription or trial to access the platform

UPDATE organizations 
SET user_subscription_enabled = true,
    user_monthly_price_piasters = COALESCE(user_monthly_price_piasters, 1000),  -- Default $10/month
    user_annual_price_piasters = COALESCE(user_annual_price_piasters, 9600),    -- Default $96/year (20% discount)
    user_currency = COALESCE(user_currency, 'USD')
WHERE user_subscription_enabled = false;
