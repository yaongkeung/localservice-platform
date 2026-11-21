ALTER TABLE posts ADD COLUMN deleted_at TEXT;
ALTER TABLE posts ADD COLUMN deleted_operation_id TEXT;
CREATE INDEX posts_archive_customer ON posts(deleted_at,company_id,updated_at);
CREATE INDEX posts_archive_operation ON posts(deleted_operation_id) WHERE deleted_operation_id IS NOT NULL;

CREATE TABLE post_archive_batches (
 operation_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 action TEXT NOT NULL CHECK(action IN ('DELETE','RESTORE')),
 target_count INTEGER NOT NULL CHECK(target_count BETWEEN 1 AND 1000),
 customer_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE post_archive_events (
 id INTEGER PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES post_archive_batches(operation_id),
 post_id INTEGER NOT NULL REFERENCES posts(id), item_version INTEGER NOT NULL,
 snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
 UNIQUE(operation_id,post_id)
);
CREATE INDEX post_archive_events_post ON post_archive_events(post_id,id);

CREATE TRIGGER archived_post_private_insert BEFORE INSERT ON posts
WHEN NEW.deleted_at IS NOT NULL AND NEW.status!='DRAFT'
BEGIN SELECT RAISE(ABORT,'Archived post must remain private'); END;
CREATE TRIGGER archived_post_private_update BEFORE UPDATE ON posts
WHEN NEW.deleted_at IS NOT NULL AND NEW.status!='DRAFT'
BEGIN SELECT RAISE(ABORT,'Archived post must remain private'); END;
CREATE TRIGGER archived_post_locked BEFORE UPDATE ON posts
WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Restore archived post before editing'); END;
CREATE TRIGGER archived_post_photo_insert BEFORE INSERT ON post_images
WHEN EXISTS(SELECT 1 FROM posts WHERE id=NEW.post_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Post is archived'); END;
CREATE TRIGGER archived_post_photo_update BEFORE UPDATE ON post_images
WHEN EXISTS(SELECT 1 FROM posts WHERE id=NEW.post_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Post is archived'); END;

CREATE TABLE post_search_checks (
 id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id),
 user_id INTEGER NOT NULL REFERENCES users(id), post_version INTEGER NOT NULL,
 query TEXT NOT NULL CHECK(length(query) BETWEEN 3 AND 160),
 public_path TEXT NOT NULL, result TEXT NOT NULL CHECK(result IN ('FOUND','NOT_FOUND','FAILED')),
 device TEXT NOT NULL CHECK(device IN ('PC','MOBILE')),
 method TEXT NOT NULL DEFAULT 'MANUAL_BROWSER' CHECK(method='MANUAL_BROWSER'),
 note TEXT NOT NULL DEFAULT '' CHECK(length(note)<=500),
 checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX post_search_checks_latest ON post_search_checks(post_id,id DESC);
