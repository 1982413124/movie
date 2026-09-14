-- Temporary allocations are separate from purchase history and benefit records.
CREATE TABLE IF NOT EXISTS seat_holds (
    showing_id VARCHAR(100) NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
    seat_id VARCHAR(100) NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    owner_hash VARCHAR(64) NOT NULL CHECK (owner_hash ~ '^[a-f0-9]{64}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (showing_id, seat_id),
    CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '10 minutes')
);
CREATE INDEX IF NOT EXISTS idx_seat_holds_owner ON seat_holds(owner_hash, showing_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expiry ON seat_holds(expires_at);

-- Both tables take the same row lock, including writes outside the HTTP API.
-- The API takes this lock before pricing, so lock order is always showing -> points.
CREATE OR REPLACE FUNCTION guard_seat_hold() RETURNS TRIGGER AS $$
DECLARE room_id VARCHAR(50);
BEGIN
    SELECT screen_id INTO room_id FROM showings WHERE id = NEW.showing_id FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM seats WHERE id = NEW.seat_id AND screen_id = room_id) THEN
        RAISE EXCEPTION 'Seat does not belong to showing' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM reservation_seats WHERE showing_id = NEW.showing_id
        AND seat_id = NEW.seat_id AND released_at IS NULL) THEN
        RAISE EXCEPTION 'Seat is already reserved' USING ERRCODE = '23505',
            CONSTRAINT = 'uq_reservation_seats_showing_seat_active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_guard_seat_hold ON seat_holds;
CREATE TRIGGER trg_guard_seat_hold BEFORE INSERT OR UPDATE ON seat_holds
    FOR EACH ROW EXECUTE FUNCTION guard_seat_hold();

CREATE OR REPLACE FUNCTION guard_reservation_against_hold() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.released_at IS NULL THEN
        PERFORM id FROM showings WHERE id = NEW.showing_id FOR UPDATE;
        IF EXISTS (SELECT 1 FROM seat_holds WHERE showing_id = NEW.showing_id
            AND seat_id = NEW.seat_id AND expires_at > clock_timestamp()) THEN
            RAISE EXCEPTION 'Seat is temporarily held' USING ERRCODE = '23505',
                CONSTRAINT = 'seat_holds_pkey';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_guard_reservation_hold ON reservation_seats;
CREATE TRIGGER trg_guard_reservation_hold BEFORE INSERT OR UPDATE OF showing_id, seat_id, released_at
    ON reservation_seats FOR EACH ROW EXECUTE FUNCTION guard_reservation_against_hold();
