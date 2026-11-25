ALTER TABLE companies ADD COLUMN photo_mutation_token TEXT;
CREATE TABLE company_images (
 id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL REFERENCES companies(id),
 storage_key TEXT NOT NULL UNIQUE, thumbnail_key TEXT NOT NULL UNIQUE,
 alt_text TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
 content_hash TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
 excluded INTEGER NOT NULL DEFAULT 0 CHECK(excluded IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX company_images_owner ON company_images(company_id,excluded,sort_order);
CREATE UNIQUE INDEX company_images_active_hash ON company_images(company_id,content_hash) WHERE excluded=0;
CREATE TRIGGER company_photo_count_guard BEFORE INSERT ON company_images
WHEN NEW.excluded=0 AND (SELECT COUNT(*) FROM company_images WHERE company_id=NEW.company_id AND excluded=0)>=8
BEGIN SELECT RAISE(ABORT,'Too many company photos'); END;
CREATE TRIGGER company_photo_restore_count_guard BEFORE UPDATE OF excluded ON company_images
WHEN OLD.excluded=1 AND NEW.excluded=0 AND (SELECT COUNT(*) FROM company_images WHERE company_id=NEW.company_id AND excluded=0)>=8
BEGIN SELECT RAISE(ABORT,'Too many company photos'); END;
