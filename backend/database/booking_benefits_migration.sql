-- Additive migration. Historical payments keep their original totals; no retroactive points or mail.
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
    name VARCHAR(100) NOT NULL,
    discount_type VARCHAR(16) NOT NULL CHECK (discount_type IN ('FIXED', 'PERCENT')),
    discount_value INTEGER NOT NULL CHECK (discount_value > 0),
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (discount_type <> 'PERCENT' OR discount_value <= 100),
    CHECK (starts_at IS NULL OR expires_at > starts_at)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_amount INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id) ON DELETE RESTRICT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0;
UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount IS NULL;
ALTER TABLE orders ALTER COLUMN subtotal_amount SET NOT NULL;
-- Keep old operator/fixture inserts compatible when no discount snapshot was supplied.
CREATE OR REPLACE FUNCTION fill_order_subtotal() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.subtotal_amount IS NULL THEN NEW.subtotal_amount = NEW.total_amount; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_fill_order_subtotal ON orders;
CREATE TRIGGER trg_fill_order_subtotal BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION fill_order_subtotal();
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_order_discount_snapshot') THEN
        ALTER TABLE orders ADD CONSTRAINT chk_order_discount_snapshot CHECK (
            subtotal_amount >= 0 AND coupon_discount_amount >= 0 AND points_used >= 0 AND points_earned >= 0
            AND total_amount = subtotal_amount - coupon_discount_amount - points_used
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS point_accounts (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- Reversing already-spent earnings can make this negative. Available points are max(0, balance).
    balance INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS point_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('EARN', 'USE', 'EARN_REVERSED', 'USE_RETURNED')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, kind),
    CHECK ((kind IN ('EARN', 'USE_RETURNED') AND amount > 0)
        OR (kind IN ('USE', 'EARN_REVERSED') AND amount < 0))
);
CREATE INDEX IF NOT EXISTS idx_point_transactions_member ON point_transactions(user_id, id DESC);

CREATE TABLE IF NOT EXISTS reservation_email_outbox (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type VARCHAR(24) NOT NULL CHECK (event_type IN ('CONFIRMED', 'CANCELLED')),
    recipient VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ,
    last_error VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, event_type)
);
CREATE INDEX IF NOT EXISTS idx_reservation_mail_pending ON reservation_email_outbox(next_attempt_at, id) WHERE status = 'pending';
