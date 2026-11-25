-- Public address metadata is separate from authored posts and audit records.
CREATE TABLE post_urls (
 post_id INTEGER PRIMARY KEY REFERENCES posts(id),
 path TEXT NOT NULL UNIQUE CHECK(length(path)<=2048 AND path LIKE '/%/%/%.html'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER post_url_immutable BEFORE UPDATE ON post_urls
BEGIN SELECT RAISE(ABORT,'Published URL is immutable'); END;
