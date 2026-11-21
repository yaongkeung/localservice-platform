ALTER TABLE companies ADD COLUMN deleted_at TEXT;
ALTER TABLE services ADD COLUMN deleted_at TEXT;
CREATE TABLE catalog_events (
 id INTEGER PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
 kind TEXT NOT NULL CHECK(kind IN ('companies','services')), item_id INTEGER NOT NULL,
 user_id INTEGER NOT NULL REFERENCES users(id), action TEXT NOT NULL CHECK(action IN ('DELETE','RESTORE')),
 item_version INTEGER NOT NULL, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX catalog_events_item ON catalog_events(kind,item_id,id);

-- A deleted company cannot be made public by changing only its status.
CREATE TRIGGER archived_company_disabled BEFORE UPDATE ON companies
WHEN NEW.deleted_at IS NOT NULL AND NEW.status!='DISABLED'
BEGIN SELECT RAISE(ABORT,'Archived company must remain disabled'); END;

-- Retain categories referenced by any current post or active child.
CREATE TRIGGER archive_service_in_use BEFORE UPDATE OF deleted_at ON services
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND (
 EXISTS(SELECT 1 FROM posts WHERE service_id=OLD.id) OR
 EXISTS(SELECT 1 FROM services WHERE parent_id=OLD.id AND deleted_at IS NULL))
BEGIN SELECT RAISE(ABORT,'Service is in use'); END;
CREATE TRIGGER restore_service_parent BEFORE UPDATE OF deleted_at ON services
WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND
 EXISTS(SELECT 1 FROM services WHERE id=NEW.parent_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Restore parent service first'); END;
CREATE TRIGGER post_active_service_insert BEFORE INSERT ON posts
WHEN EXISTS(SELECT 1 FROM services WHERE id=NEW.service_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Service is archived'); END;
CREATE TRIGGER post_active_service_update BEFORE UPDATE OF service_id ON posts
WHEN EXISTS(SELECT 1 FROM services WHERE id=NEW.service_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Service is archived'); END;
CREATE TRIGGER child_active_service_insert BEFORE INSERT ON services
WHEN EXISTS(SELECT 1 FROM services WHERE id=NEW.parent_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Parent service is archived'); END;
CREATE TRIGGER child_active_service_update BEFORE UPDATE OF parent_id ON services
WHEN NEW.deleted_at IS NULL AND EXISTS(SELECT 1 FROM services WHERE id=NEW.parent_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Parent service is archived'); END;
