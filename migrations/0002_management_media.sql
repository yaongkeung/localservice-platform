ALTER TABLE companies ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE services ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN mutation_token TEXT;
ALTER TABLE contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE posts ADD COLUMN contract_id INTEGER REFERENCES contracts(id);
ALTER TABLE posts ADD COLUMN mutation_token TEXT;
ALTER TABLE post_images ADD COLUMN excluded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE post_images ADD COLUMN width INTEGER NOT NULL DEFAULT 960;
ALTER TABLE post_images ADD COLUMN height INTEGER NOT NULL DEFAULT 640;
CREATE UNIQUE INDEX active_image_hash_unique ON post_images(content_hash) WHERE excluded=0 AND content_hash IS NOT NULL;
CREATE TRIGGER photo_insert_guard BEFORE INSERT ON post_images
WHEN (SELECT status FROM posts WHERE id=NEW.post_id)!='DRAFT' AND NEW.content_hash IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Photos require draft'); END;
CREATE TRIGGER photo_update_guard BEFORE UPDATE ON post_images
WHEN (SELECT status FROM posts WHERE id=OLD.post_id)!='DRAFT'
BEGIN SELECT RAISE(ABORT,'Photos require draft'); END;
CREATE TRIGGER photo_count_guard BEFORE INSERT ON post_images
WHEN NEW.excluded=0 AND (SELECT COUNT(*) FROM post_images WHERE post_id=NEW.post_id AND excluded=0)>=8
BEGIN SELECT RAISE(ABORT,'Too many photos'); END;
CREATE TRIGGER photo_restore_count_guard BEFORE UPDATE OF excluded ON post_images
WHEN OLD.excluded=1 AND NEW.excluded=0 AND (SELECT COUNT(*) FROM post_images WHERE post_id=NEW.post_id AND excluded=0)>=8
BEGIN SELECT RAISE(ABORT,'Too many photos'); END;
CREATE TRIGGER publish_contract_guard BEFORE UPDATE OF status ON posts
WHEN NEW.status='PUBLISHED' AND OLD.status!='PUBLISHED'
BEGIN
 SELECT CASE WHEN (SELECT status FROM companies WHERE id=NEW.company_id)!='ACTIVE' THEN RAISE(ABORT,'Inactive company') END;
 SELECT CASE WHEN NEW.sample=0 AND NEW.contract_id IS NULL THEN RAISE(ABORT,'Contract required') END;
 SELECT CASE WHEN NEW.contract_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM contracts c WHERE c.id=NEW.contract_id AND c.company_id=NEW.company_id AND c.status='ACTIVE'
  AND (c.start_date IS NULL OR c.start_date<=NEW.published_at) AND (c.end_date IS NULL OR c.end_date>=NEW.published_at)
  AND c.published_quantity<c.contract_quantity
 ) THEN RAISE(ABORT,'Contract unavailable or full') END;
END;
CREATE TRIGGER publish_contract_count AFTER UPDATE OF status ON posts
WHEN NEW.status='PUBLISHED' AND OLD.status!='PUBLISHED' AND NEW.contract_id IS NOT NULL
BEGIN UPDATE contracts SET published_quantity=published_quantity+1,version=version+1 WHERE id=NEW.contract_id; END;
CREATE TRIGGER published_contract_immutable BEFORE UPDATE OF contract_id ON posts
WHEN OLD.status='PUBLISHED' AND NEW.contract_id IS NOT OLD.contract_id
BEGIN SELECT RAISE(ABORT,'Published contract is immutable'); END;
CREATE TRIGGER contract_quantity_guard BEFORE UPDATE OF contract_quantity ON contracts
WHEN NEW.contract_quantity<OLD.published_quantity
BEGIN SELECT RAISE(ABORT,'Quantity below published count'); END;
