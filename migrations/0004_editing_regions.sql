CREATE UNIQUE INDEX regions_admin_code_unique ON regions(admin_code);
ALTER TABLE posts ADD COLUMN published_once INTEGER NOT NULL DEFAULT 0;
UPDATE posts SET published_once=1 WHERE status='PUBLISHED' OR id IN (SELECT post_id FROM post_events WHERE to_status='PUBLISHED');
CREATE TABLE post_snapshots (
 id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id), actor_id INTEGER NOT NULL REFERENCES users(id),
 post_version INTEGER NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER post_status_guard;
CREATE TRIGGER post_status_guard BEFORE UPDATE OF status ON posts
WHEN NEW.status!=OLD.status AND NOT (
 (OLD.status='DRAFT' AND NEW.status='REVIEW') OR
 (OLD.status='REVIEW' AND NEW.status IN ('DRAFT','APPROVED')) OR
 (OLD.status='APPROVED' AND NEW.status IN ('DRAFT','PUBLISHED')) OR
 (OLD.status='PUBLISHED' AND NEW.status='DRAFT')
)
BEGIN SELECT RAISE(ABORT,'Invalid post status transition'); END;
CREATE TRIGGER published_snapshot BEFORE UPDATE OF status ON posts
WHEN OLD.status='PUBLISHED' AND NEW.status='DRAFT'
BEGIN
 INSERT INTO post_snapshots(post_id,actor_id,post_version,snapshot) VALUES(OLD.id,NEW.last_actor_id,OLD.version,
 json_object('title',OLD.title,'summary',OLD.summary,'content',json(OLD.content),'company_id',OLD.company_id,
 'region_id',OLD.region_id,'service_id',OLD.service_id,'contract_id',OLD.contract_id,'post_type',OLD.post_type,
 'published_at',OLD.published_at,'sample',OLD.sample,'images',json((SELECT COALESCE(json_group_array(json_object(
 'id',id,'storage_key',storage_key,'thumbnail_key',thumbnail_key,'alt_text',alt_text,'sort_order',sort_order,'excluded',excluded
 )), '[]') FROM post_images WHERE post_id=OLD.id))));
END;
DROP TRIGGER publish_contract_guard;
CREATE TRIGGER publish_contract_guard BEFORE UPDATE OF status ON posts
WHEN NEW.status='PUBLISHED' AND OLD.status!='PUBLISHED'
BEGIN
 SELECT CASE WHEN (SELECT status FROM companies WHERE id=NEW.company_id)!='ACTIVE' THEN RAISE(ABORT,'Inactive company') END;
 SELECT CASE WHEN (SELECT sample FROM companies WHERE id=NEW.company_id)=0 AND NEW.contract_id IS NULL THEN RAISE(ABORT,'Contract required') END;
 SELECT CASE WHEN OLD.published_once=0 AND NEW.contract_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM contracts c WHERE c.id=NEW.contract_id AND c.company_id=NEW.company_id AND c.status='ACTIVE'
  AND (c.start_date IS NULL OR c.start_date<=NEW.published_at) AND (c.end_date IS NULL OR c.end_date>=NEW.published_at)
  AND c.published_quantity<c.contract_quantity
 ) THEN RAISE(ABORT,'Contract unavailable or full') END;
END;
DROP TRIGGER publish_contract_count;
CREATE TRIGGER publish_contract_count AFTER UPDATE OF status ON posts
WHEN NEW.status='PUBLISHED' AND OLD.status!='PUBLISHED' AND OLD.published_once=0
BEGIN
 UPDATE contracts SET published_quantity=published_quantity+1,version=version+1 WHERE id=NEW.contract_id;
 UPDATE posts SET published_once=1 WHERE id=NEW.id;
END;
DROP TRIGGER published_contract_immutable;
CREATE TRIGGER published_contract_immutable BEFORE UPDATE OF contract_id,company_id ON posts
WHEN OLD.published_once=1 AND (NEW.contract_id IS NOT OLD.contract_id OR NEW.company_id!=OLD.company_id)
BEGIN SELECT RAISE(ABORT,'Published company and contract are immutable'); END;
