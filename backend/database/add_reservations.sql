CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_email VARCHAR(255),
    movie_id VARCHAR(100) NOT NULL,
    screening_id VARCHAR(100) NOT NULL,
    screen_name VARCHAR(100),
    screening_time VARCHAR(50),
    ticket_count INTEGER NOT NULL DEFAULT 0,
    ticket_total_price INTEGER NOT NULL DEFAULT 0,
    food_total_price INTEGER NOT NULL DEFAULT 0,
    total_price INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'reserved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reservations_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reservation_seats (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL,
    screening_id VARCHAR(100) NOT NULL,
    seat_label VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reservation_seats_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_reservation_seats_screening_seat
        UNIQUE (screening_id, seat_label)
);

CREATE INDEX IF NOT EXISTS idx_reservations_screening_id
    ON reservations(screening_id);

CREATE INDEX IF NOT EXISTS idx_reservation_seats_screening_id
    ON reservation_seats(screening_id);
