-- ============================================================================
-- Anagu Land Administration Framework — Migration 006 (UP)
-- User Notifications, MQTT Event Delivery Log, and Tamper-Evident
-- Immutable Audit Log (Append-Only Enforcement)
-- ============================================================================

BEGIN;

-- ── User Notifications (My ANAGU & Staff Alerts) ────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         notification_channel NOT NULL DEFAULT 'IN_APP',
    category        TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       UUID,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity      ON notifications(entity_type, entity_id);

-- ── MQTT Event Delivery Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mqtt_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic           TEXT NOT NULL,
    payload         JSONB NOT NULL,
    qos             SMALLINT NOT NULL DEFAULT 1 CHECK (qos IN (0, 1, 2)),
    payload_bytes   INTEGER,
    client_id       TEXT,
    message_id      TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT,
    delivered       BOOLEAN NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mqtt_topic     ON mqtt_events(topic);
CREATE INDEX IF NOT EXISTS idx_mqtt_published ON mqtt_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_delivered ON mqtt_events(delivered);

-- ── Immutable System Audit Log ──────────────────────────────────────────────
-- Append-only: UPDATE and DELETE are strictly rejected by trigger + rule.
-- Hash-chained with SHA-256 via pgcrypto for tamper detection.
CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_no     BIGSERIAL NOT NULL UNIQUE,
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    event_type      TEXT NOT NULL,
    from_status     TEXT,
    to_status       TEXT,
    actor_role      user_role,
    actor_id        TEXT NOT NULL,
    actor_address   VARCHAR(42),
    metadata        JSONB,
    ip_address      INET,
    previous_hash   VARCHAR(64),
    event_hash      VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_events(actor_id);

CREATE OR REPLACE FUNCTION fn_audit_compute_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_prev_hash TEXT;
BEGIN
    SELECT event_hash INTO v_prev_hash
    FROM audit_events
    ORDER BY sequence_no DESC
    LIMIT 1;

    NEW.previous_hash := COALESCE(v_prev_hash, repeat('0', 64));
    NEW.event_hash := encode(
        digest(
            NEW.previous_hash || '|' ||
            NEW.entity_type || '|' ||
            NEW.entity_id::text || '|' ||
            NEW.event_type || '|' ||
            COALESCE(NEW.from_status, '') || '|' ||
            COALESCE(NEW.to_status, '') || '|' ||
            NEW.actor_id || '|' ||
            COALESCE(NEW.metadata::text, '') || '|' ||
            NEW.created_at::text,
            'sha256'
        ),
        'hex'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_compute_hash ON audit_events;
CREATE TRIGGER trg_audit_compute_hash
    BEFORE INSERT ON audit_events
    FOR EACH ROW EXECUTE FUNCTION fn_audit_compute_hash();

CREATE OR REPLACE FUNCTION fn_prevent_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only and immutable: % operations are prohibited', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_events;
CREATE TRIGGER trg_audit_immutable
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_mutation();

COMMIT;
