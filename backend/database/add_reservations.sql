ALTER DATABASE movie SET timezone TO 'Asia/Tokyo';

DO $$
DECLARE
    legacy_movie_fk RECORD;
    movies_id_type TEXT;
    screenings_movie_id_type TEXT;
BEGIN
    IF to_regclass('public.movies') IS NOT NULL THEN
        SELECT data_type
        INTO movies_id_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'movies'
          AND column_name = 'id';

        IF movies_id_type IS NOT NULL
           AND movies_id_type NOT IN ('character varying', 'character', 'text') THEN
            FOR legacy_movie_fk IN
                SELECT conrelid::regclass AS table_name, conname
                FROM pg_constraint
                WHERE contype = 'f'
                  AND confrelid = 'public.movies'::regclass
            LOOP
                EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', legacy_movie_fk.table_name, legacy_movie_fk.conname);
            END LOOP;

            ALTER TABLE movies
                ALTER COLUMN id DROP DEFAULT,
                ALTER COLUMN id TYPE VARCHAR(100) USING id::text;
        END IF;
    END IF;

    IF to_regclass('public.screenings') IS NOT NULL THEN
        SELECT data_type
        INTO screenings_movie_id_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'screenings'
          AND column_name = 'movie_id';

        IF screenings_movie_id_type IS NOT NULL
           AND screenings_movie_id_type NOT IN ('character varying', 'character', 'text') THEN
            ALTER TABLE screenings
                ALTER COLUMN movie_id TYPE VARCHAR(100) USING movie_id::text;
        END IF;

        IF to_regclass('public.movies') IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM pg_constraint WHERE conname = 'fk_screenings_movie'
           ) THEN
            ALTER TABLE screenings
                ADD CONSTRAINT fk_screenings_movie
                FOREIGN KEY (movie_id)
                REFERENCES movies(id)
                ON DELETE CASCADE
                NOT VALID;
        END IF;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('public.theaters') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'uq_theaters_name'
       )
       AND NOT EXISTS (
           SELECT 1
           FROM theaters
           WHERE theater_name IS NOT NULL
           GROUP BY theater_name
           HAVING COUNT(*) > 1
       ) THEN
        ALTER TABLE theaters
            ADD CONSTRAINT uq_theaters_name
            UNIQUE (theater_name);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS screens (
    id VARCHAR(50) PRIMARY KEY,
    theater_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    seat_count INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_screens_theater
        FOREIGN KEY (theater_id)
        REFERENCES theaters(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_screens_seat_count
        CHECK (seat_count > 0),

    CONSTRAINT uq_screens_theater_name
        UNIQUE (theater_id, name)
);

CREATE TABLE IF NOT EXISTS showings (
    id VARCHAR(100) PRIMARY KEY,
    movie_id VARCHAR(100) NOT NULL,
    screen_id VARCHAR(50) NOT NULL,
    show_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_showings_screen
        FOREIGN KEY (screen_id)
        REFERENCES screens(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_showings_time_order
        CHECK (end_time > start_time),

    CONSTRAINT uq_showings_screen_time
        UNIQUE (screen_id, show_date, start_time)
);

CREATE TABLE IF NOT EXISTS seats (
    id VARCHAR(100) PRIMARY KEY,
    screen_id VARCHAR(50) NOT NULL,
    row_name VARCHAR(5) NOT NULL,
    seat_number INTEGER NOT NULL,
    seat_label VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_seats_screen
        FOREIGN KEY (screen_id)
        REFERENCES screens(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_seats_number_positive
        CHECK (seat_number > 0),

    CONSTRAINT uq_seats_screen_label
        UNIQUE (screen_id, seat_label)
);

ALTER TABLE seats
    ADD COLUMN IF NOT EXISTS screen_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS seat_number INTEGER,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
DECLARE
    seats_id_type TEXT;
BEGIN
    SELECT data_type
    INTO seats_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seats'
      AND column_name = 'id';

    IF seats_id_type IS NOT NULL
       AND seats_id_type NOT IN ('character varying', 'character', 'text') THEN
        ALTER TABLE seats
            ALTER COLUMN id DROP DEFAULT,
            ALTER COLUMN id TYPE VARCHAR(100) USING id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'seats'
          AND column_name = 'col_num'
    ) THEN
        UPDATE seats
        SET seat_number = col_num
        WHERE seat_number IS NULL
          AND col_num IS NOT NULL;

        ALTER TABLE seats
            ALTER COLUMN col_num DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'seats'
          AND column_name = 'screening_id'
    ) THEN
        ALTER TABLE seats
            ALTER COLUMN screening_id DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_seats_screen'
    ) THEN
        ALTER TABLE seats
            ADD CONSTRAINT fk_seats_screen
            FOREIGN KEY (screen_id)
            REFERENCES screens(id)
            ON DELETE CASCADE
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_number_positive'
    ) THEN
        ALTER TABLE seats
            ADD CONSTRAINT chk_seats_number_positive
            CHECK (seat_number > 0)
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_seats_screen_label'
    ) THEN
        ALTER TABLE seats
            ADD CONSTRAINT uq_seats_screen_label
            UNIQUE (screen_id, seat_label);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ticket_types (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    current_price INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_ticket_types_current_price
        CHECK (current_price >= 0)
);

CREATE TABLE IF NOT EXISTS foods (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    current_price INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_foods_current_price
        CHECK (current_price >= 0)
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS user_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS total_amount INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE orders
    ALTER COLUMN user_id DROP NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
          AND column_name = 'total_price'
    ) THEN
        ALTER TABLE orders
            ALTER COLUMN total_price DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
          AND column_name = 'total_price'
    ) THEN
        UPDATE orders
        SET total_amount = total_price
        WHERE total_amount = 0
          AND total_price IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_total_amount'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_total_amount
            CHECK (total_amount >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_status'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_status
            CHECK (order_status IN ('pending', 'paid', 'cancelled', 'expired'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS reservation_seats (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    showing_id VARCHAR(100),
    seat_id VARCHAR(100),
    movie_title_at_purchase VARCHAR(255),
    screen_name VARCHAR(100),
    showing_time VARCHAR(50),
    ticket_type_id VARCHAR(50),
    ticket_type_label VARCHAR(100),
    price_at_purchase INTEGER NOT NULL DEFAULT 0,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE reservation_seats
    ADD COLUMN IF NOT EXISTS order_id INTEGER,
    ADD COLUMN IF NOT EXISTS showing_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS seat_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS movie_title_at_purchase VARCHAR(255),
    ADD COLUMN IF NOT EXISTS screen_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS showing_time VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ticket_type_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ticket_type_label VARCHAR(100),
    ADD COLUMN IF NOT EXISTS price_at_purchase INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE reservation_seats
    ALTER COLUMN seat_id TYPE VARCHAR(100);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reservation_seats'
          AND column_name = 'movie_id'
    ) THEN
        ALTER TABLE reservation_seats
            ALTER COLUMN movie_id DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reservation_seats'
          AND column_name = 'reservation_id'
    ) THEN
        ALTER TABLE reservation_seats
            ALTER COLUMN reservation_id DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reservation_seats'
          AND column_name = 'screening_id'
    ) THEN
        ALTER TABLE reservation_seats
            ALTER COLUMN screening_id DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reservation_seats'
          AND column_name = 'seat_label'
    ) THEN
        ALTER TABLE reservation_seats
            ALTER COLUMN seat_label DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservation_seats'
          AND column_name = 'screening_id'
    ) THEN
        UPDATE reservation_seats
        SET showing_id = screening_id
        WHERE showing_id IS NULL
          AND screening_id IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservation_seats'
          AND column_name = 'seat_label'
    ) THEN
        UPDATE reservation_seats
        SET seat_id = seat_label
        WHERE seat_id IS NULL
          AND seat_label IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.reservation_seats') IS NOT NULL
       AND to_regclass('public.showings') IS NOT NULL
       AND to_regclass('public.movies') IS NOT NULL THEN
        UPDATE reservation_seats rs
        SET movie_title_at_purchase = m.title
        FROM showings sh
        JOIN movies m
          ON m.id = sh.movie_id
        WHERE rs.movie_title_at_purchase IS NULL
          AND rs.showing_id = sh.id;
    END IF;
END $$;

ALTER TABLE reservation_seats
    DROP CONSTRAINT IF EXISTS uq_reservation_seats_screening_seat;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_seats_order'
    ) THEN
        ALTER TABLE reservation_seats
            ADD CONSTRAINT fk_reservation_seats_order
            FOREIGN KEY (order_id)
            REFERENCES orders(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_seats_showing'
    ) THEN
        ALTER TABLE reservation_seats
            ADD CONSTRAINT fk_reservation_seats_showing
            FOREIGN KEY (showing_id)
            REFERENCES showings(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_seats_seat'
    ) THEN
        ALTER TABLE reservation_seats
            ADD CONSTRAINT fk_reservation_seats_seat
            FOREIGN KEY (seat_id)
            REFERENCES seats(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_seats_movie'
    ) THEN
        ALTER TABLE reservation_seats
            DROP CONSTRAINT IF EXISTS fk_reservation_seats_movie;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_seats_ticket_type'
    ) THEN
        ALTER TABLE reservation_seats
            ADD CONSTRAINT fk_reservation_seats_ticket_type
            FOREIGN KEY (ticket_type_id)
            REFERENCES ticket_types(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_seats_price'
    ) THEN
        ALTER TABLE reservation_seats
            ADD CONSTRAINT chk_reservation_seats_price
            CHECK (price_at_purchase >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS food_order_details (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    food_id VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_food_order_details_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_food_order_details_food
        FOREIGN KEY (food_id)
        REFERENCES foods(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_food_order_details_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_food_order_details_amounts
        CHECK (unit_price >= 0 AND subtotal >= 0)
);

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_amount INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'pay_method'
    ) THEN
        ALTER TABLE payments
            ALTER COLUMN pay_method DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'pay_num'
    ) THEN
        ALTER TABLE payments
            ALTER COLUMN pay_num DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'pay_status'
    ) THEN
        ALTER TABLE payments
            ALTER COLUMN pay_status DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'pay_method'
    ) THEN
        UPDATE payments
        SET payment_method = pay_method
        WHERE payment_method IS NULL
          AND pay_method IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'pay_status'
    ) THEN
        UPDATE payments
        SET payment_status = pay_status
        WHERE payment_status = 'unpaid'
          AND pay_status IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.orders') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'orders'
             AND column_name = 'pay_datetime'
       )
       AND to_regclass('public.payments') IS NOT NULL THEN
        UPDATE payments p
        SET paid_at = o.pay_datetime
        FROM orders o
        WHERE p.order_id = o.id
          AND p.paid_at IS NULL
          AND o.pay_datetime IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_amount'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT chk_payments_amount
            CHECK (payment_amount >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_status'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT chk_payments_status
            CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_showings_movie'
    ) THEN
        ALTER TABLE showings
            ADD CONSTRAINT fk_showings_movie
            FOREIGN KEY (movie_id)
            REFERENCES movies(id)
            ON DELETE CASCADE
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_food_order_details_food'
    ) THEN
        ALTER TABLE food_order_details
            ADD CONSTRAINT fk_food_order_details_food
            FOREIGN KEY (food_id)
            REFERENCES foods(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_showings_movie_id
    ON showings(movie_id);

CREATE INDEX IF NOT EXISTS idx_showings_screen_date
    ON showings(screen_id, show_date);

CREATE INDEX IF NOT EXISTS idx_orders_user_email
    ON orders(user_email);

CREATE INDEX IF NOT EXISTS idx_reservation_seats_order_id
    ON reservation_seats(order_id);

CREATE INDEX IF NOT EXISTS idx_reservation_seats_showing_id
    ON reservation_seats(showing_id);

CREATE INDEX IF NOT EXISTS idx_reservation_seats_seat_id
    ON reservation_seats(seat_id);


CREATE INDEX IF NOT EXISTS idx_reservation_seats_ticket_type_id
    ON reservation_seats(ticket_type_id);

UPDATE reservation_seats rs
SET released_at = COALESCE(rs.released_at, o.updated_at, o.created_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
FROM orders o
WHERE rs.order_id = o.id
  AND o.order_status = 'expired'
  AND rs.released_at IS NULL;

CREATE OR REPLACE FUNCTION release_reservation_seats_for_expired_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_status = 'expired' THEN
        UPDATE reservation_seats
        SET released_at = COALESCE(released_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE order_id = NEW.id
          AND released_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_release_reservation_seats_for_expired_order ON orders;

CREATE TRIGGER trg_release_reservation_seats_for_expired_order
AFTER UPDATE OF order_status ON orders
FOR EACH ROW
WHEN (NEW.order_status = 'expired')
EXECUTE FUNCTION release_reservation_seats_for_expired_order();
DROP INDEX IF EXISTS uq_reservation_seats_screening_seat_active;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reservation_seats_showing_seat_active
    ON reservation_seats(showing_id, seat_id)
    WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_food_order_details_order_id
    ON food_order_details(order_id);

CREATE INDEX IF NOT EXISTS idx_food_order_details_food_id
    ON food_order_details(food_id);

CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON payments(order_id);

-- 既存のtimestamp without time zoneは、旧DBではUTCとして保存されていた前提でtimestamptzへ寄せる。
-- 保存値を単純に+9時間せず、接続時のtimezone=Asia/Tokyoで日本時間として見えるようにする。
DO $$
DECLARE
    target_column RECORD;
BEGIN
    FOR target_column IN
        SELECT *
        FROM (VALUES
            ('users', 'created_at'),
            ('users', 'updated_at'),
            ('movies', 'created_at'),
            ('movies', 'updated_at'),
            ('theaters', 'created_at'),
            ('theaters', 'updated_at'),
            ('screens', 'created_at'),
            ('screens', 'updated_at'),
            ('showings', 'created_at'),
            ('showings', 'updated_at'),
            ('seats', 'created_at'),
            ('seats', 'updated_at'),
            ('ticket_types', 'created_at'),
            ('ticket_types', 'updated_at'),
            ('foods', 'created_at'),
            ('foods', 'updated_at'),
            ('orders', 'created_at'),
            ('orders', 'updated_at'),
            ('orders', 'cancelled_at'),
            ('reservation_seats', 'created_at'),
            ('reservation_seats', 'updated_at'),
            ('reservation_seats', 'released_at'),
            ('food_order_details', 'created_at'),
            ('food_order_details', 'updated_at'),
            ('payments', 'paid_at'),
            ('payments', 'created_at'),
            ('payments', 'updated_at')
        ) AS columns_to_convert(table_name, column_name)
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = target_column.table_name
              AND column_name = target_column.column_name
              AND data_type = 'timestamp without time zone'
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE %L',
                target_column.table_name,
                target_column.column_name,
                target_column.column_name,
                'UTC'
            );
        END IF;
    END LOOP;
END $$;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS chk_orders_status;

UPDATE orders
SET order_status = 'paid'
WHERE order_status = 'confirmed';

UPDATE orders
SET order_status = 'cancelled'
WHERE order_status = 'canceled';

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status
    CHECK (order_status IN ('pending', 'paid', 'cancelled', 'expired'));

UPDATE payments p
SET payment_status = 'refunded',
    updated_at = CURRENT_TIMESTAMP
FROM orders o
WHERE p.order_id = o.id
  AND o.order_status = 'cancelled'
  AND p.payment_status = 'paid';

DO $$
BEGIN
    IF to_regclass('public.orders') IS NOT NULL THEN
        ALTER TABLE orders
            DROP COLUMN IF EXISTS pay_datetime,
            DROP COLUMN IF EXISTS total_price;
    END IF;

    IF to_regclass('public.payments') IS NOT NULL THEN
        ALTER TABLE payments
            DROP COLUMN IF EXISTS pay_method,
            DROP COLUMN IF EXISTS pay_num,
            DROP COLUMN IF EXISTS pay_status;
    END IF;
END $$;

-- 使われていないと判断した理由:
-- 現在の予約作成、キャンセル、履歴APIは orders を親にし、reservation_seats は order_id/showing_id/seat_id を参照している。
-- 旧 reservations / reservation_ticket_types と reservation_seats.reservation_id/screening_id/seat_label/movie_id はAPIから参照されていない。
-- ただし履歴を消さないため、旧 reservations の内容を LEGACY-RES-* の orders に移し、移行できた場合だけ旧カラムを削除する。
DO $$
BEGIN
    IF to_regclass('public.reservations') IS NOT NULL THEN
        INSERT INTO orders (
            user_id,
            user_email,
            order_num,
            total_amount,
            order_status,
            cancelled_at,
            created_at,
            updated_at
        )
        SELECT
            r.user_id,
            r.user_email,
            'LEGACY-RES-' || r.id::text,
            r.total_price,
            CASE
                WHEN lower(r.status) IN ('canceled', 'cancelled') THEN 'cancelled'
                WHEN lower(r.status) IN ('expired') THEN 'expired'
                ELSE 'paid'
            END,
            CASE
                WHEN lower(r.status) IN ('canceled', 'cancelled') THEN COALESCE((
                    SELECT max(rs.released_at)
                    FROM reservation_seats rs
                    WHERE rs.reservation_id = r.id
                ), r.created_at)
                ELSE NULL
            END,
            r.created_at,
            CURRENT_TIMESTAMP
        FROM reservations r
        WHERE NOT EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.order_num = 'LEGACY-RES-' || r.id::text
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.reservation_ticket_types') IS NOT NULL THEN
        INSERT INTO ticket_types (id, label, current_price)
        SELECT DISTINCT ticket_type_id, label, unit_price
        FROM reservation_ticket_types
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.reservations') IS NOT NULL THEN
        INSERT INTO movies (id, title, duration_minutes)
        SELECT DISTINCT r.movie_id, r.movie_id, 120
        FROM reservations r
        WHERE r.movie_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO theaters (theater_name)
        SELECT 'HAL CINEMA 名古屋栄'
        WHERE NOT EXISTS (
            SELECT 1
            FROM theaters
            WHERE theater_name = 'HAL CINEMA 名古屋栄'
        );

        INSERT INTO screens (id, theater_id, name, seat_count)
        SELECT
            'legacy-' || md5(COALESCE(r.screen_name, r.screening_id, 'screen')),
            t.id,
            COALESCE(r.screen_name, '旧スクリーン'),
            GREATEST(MAX(COALESCE(r.ticket_count, 1)), 1)
        FROM reservations r
        CROSS JOIN LATERAL (
            SELECT id
            FROM theaters
            WHERE theater_name = 'HAL CINEMA 名古屋栄'
            ORDER BY id
            LIMIT 1
        ) t
        WHERE NOT EXISTS (
            SELECT 1
            FROM screens sc
            WHERE sc.theater_id = t.id
              AND sc.name = COALESCE(r.screen_name, '旧スクリーン')
        )
        GROUP BY 1, t.id, COALESCE(r.screen_name, '旧スクリーン')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO showings (id, movie_id, screen_id, show_date, start_time, end_time)
        SELECT DISTINCT
            r.screening_id,
            r.movie_id,
            sc.id,
            COALESCE(r.created_at::date, CURRENT_DATE),
            CASE
                WHEN COALESCE(r.screening_time, '') ~ '^\d{1,2}:\d{2}' THEN r.screening_time::time
                ELSE TIME '00:00'
            END,
            CASE
                WHEN COALESCE(r.screening_time, '') ~ '^\d{1,2}:\d{2}' THEN r.screening_time::time + INTERVAL '120 minutes'
                ELSE TIME '02:00'
            END
        FROM reservations r
        CROSS JOIN LATERAL (
            SELECT id
            FROM theaters
            WHERE theater_name = 'HAL CINEMA 名古屋栄'
            ORDER BY id
            LIMIT 1
        ) t
        JOIN LATERAL (
            SELECT id
            FROM screens
            WHERE theater_id = t.id
              AND name = COALESCE(r.screen_name, '旧スクリーン')
            ORDER BY id
            LIMIT 1
        ) sc ON TRUE
        WHERE r.screening_id IS NOT NULL
          AND r.movie_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF to_regclass('public.reservations') IS NOT NULL
       AND to_regclass('public.reservation_seats') IS NOT NULL THEN
        INSERT INTO seats (id, screen_id, row_name, seat_number, seat_label)
        SELECT DISTINCT
            COALESCE(rs.seat_id, rs.seat_label),
            sh.screen_id,
            COALESCE(NULLIF(split_part(COALESCE(rs.seat_id, rs.seat_label), '-', 1), ''), 'A'),
            CASE
                WHEN COALESCE(rs.seat_id, rs.seat_label) ~ '[0-9]+' THEN substring(COALESCE(rs.seat_id, rs.seat_label) from '([0-9]+)$')::integer
                ELSE 1
            END,
            COALESCE(rs.seat_id, rs.seat_label)
        FROM reservation_seats rs
        JOIN reservations r
          ON r.id = rs.reservation_id
        JOIN showings sh
          ON sh.id = r.screening_id
        WHERE COALESCE(rs.seat_id, rs.seat_label) IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('public.reservations') IS NOT NULL
       AND to_regclass('public.reservation_seats') IS NOT NULL THEN
        UPDATE reservation_seats rs
        SET order_id = o.id,
            showing_id = COALESCE(rs.showing_id, r.screening_id),
            seat_id = COALESCE(rs.seat_id, rs.seat_label),
            screen_name = COALESCE(rs.screen_name, r.screen_name),
            showing_time = COALESCE(rs.showing_time, r.screening_time),
            movie_title_at_purchase = COALESCE(rs.movie_title_at_purchase, m.title, r.movie_id),
            ticket_type_id = COALESCE(rs.ticket_type_id, rtt.ticket_type_id, 'general'),
            ticket_type_label = COALESCE(rs.ticket_type_label, rtt.label, '一般'),
            price_at_purchase = CASE
                WHEN rs.price_at_purchase > 0 THEN rs.price_at_purchase
                ELSE COALESCE(rtt.unit_price, 0)
            END,
            updated_at = CURRENT_TIMESTAMP
        FROM reservations r
        JOIN orders o
          ON o.order_num = 'LEGACY-RES-' || r.id::text
        LEFT JOIN movies m
          ON m.id = r.movie_id
        LEFT JOIN LATERAL (
            SELECT ticket_type_id, label, unit_price
            FROM reservation_ticket_types
            WHERE reservation_id = r.id
            ORDER BY id
            LIMIT 1
        ) rtt ON TRUE
        WHERE rs.reservation_id = r.id;
    END IF;
END $$;

DROP INDEX IF EXISTS idx_reservation_seats_screening_id;
DROP INDEX IF EXISTS uq_reservation_seats_screening_seat_active;

ALTER TABLE reservation_seats
    DROP CONSTRAINT IF EXISTS fk_reservation_seats_reservation,
    DROP CONSTRAINT IF EXISTS fk_reservation_seats_movie;

DO $$
BEGIN
    IF to_regclass('public.reservation_seats') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM reservation_seats
           WHERE order_id IS NULL
              OR showing_id IS NULL
              OR seat_id IS NULL
       ) THEN
        ALTER TABLE reservation_seats
            DROP COLUMN IF EXISTS reservation_id,
            DROP COLUMN IF EXISTS screening_id,
            DROP COLUMN IF EXISTS seat_label,
            DROP COLUMN IF EXISTS movie_id;
    ELSE
        RAISE NOTICE 'reservation_seats legacy columns were kept because some rows were not migrated to order_id/showing_id/seat_id.';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.reservations') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM reservations r
            WHERE NOT EXISTS (
                SELECT 1
                FROM orders o
                WHERE o.order_num = 'LEGACY-RES-' || r.id::text
            )
        ) THEN
            DROP TABLE IF EXISTS reservation_ticket_types;
            DROP TABLE IF EXISTS reservations;
        ELSE
            RAISE NOTICE 'legacy reservations tables were kept because some rows were not migrated to orders.';
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.order_details') IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM order_details) THEN
            DROP TABLE order_details;
        ELSE
            RAISE NOTICE 'order_details was kept because it still has rows.';
        END IF;
    END IF;
END $$;
ALTER TABLE seats
    DROP CONSTRAINT IF EXISTS fk_seats_screening;

DO $$
BEGIN
    IF to_regclass('public.seats') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM seats
           WHERE screen_id IS NULL
              OR seat_number IS NULL
       ) THEN
        ALTER TABLE seats
            DROP COLUMN IF EXISTS screening_id,
            DROP COLUMN IF EXISTS col_num,
            DROP COLUMN IF EXISTS is_reserved;
    ELSE
        RAISE NOTICE 'seats legacy columns were kept because some rows were not migrated to screen_id/seat_number.';
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('public.screenings') IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM screenings) THEN
            DROP TABLE screenings;
        ELSE
            RAISE NOTICE 'screenings was kept because it still has rows.';
        END IF;
    END IF;
END $$;