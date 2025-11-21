
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS orders (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT NOT NULL,
    order_type TEXT NOT NULL,
    token_in TEXT NOT NULL,
    token_out TEXT NOT NULL,
    amount_in NUMERIC NOT NULL,
    min_amount_out NUMERIC NULL,
    chosen_dex TEXT NULL,
    executed_price NUMERIC NULL,
    tx_hash TEXT NULL,
    attempts INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
    );

CREATE TABLE IF NOT EXISTS order_events (
                                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    event_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb
    );

CREATE TABLE IF NOT EXISTS order_failures (
                                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    failure_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    attempt INTEGER,
    error TEXT,
    stack TEXT
    );

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
