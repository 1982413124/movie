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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_ticket_types_current_price
        CHECK (current_price >= 0)
);

CREATE TABLE IF NOT EXISTS foods (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    current_price INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_foods_current_price
        CHECK (current_price >= 0)
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS user_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS total_amount INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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
            CHECK (order_status IN ('pending', 'confirmed', 'cancelled'));
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
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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
