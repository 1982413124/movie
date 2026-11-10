CREATE TABLE IF NOT EXISTS movie_images (
    filename VARCHAR(37) PRIMARY KEY,
    content BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movie_images_filename
        CHECK (filename ~ '^[a-f0-9]{32}[.]webp$'),
    CONSTRAINT chk_movie_images_size
        CHECK (octet_length(content) BETWEEN 1 AND 5242880)
);
