-- Customer labels are private CMS data; existing names must be entered by the operator.
ALTER TABLE companies ADD COLUMN customer_name TEXT NOT NULL DEFAULT '' CHECK(length(customer_name)<=80);

-- Publication no longer consumes or requires a contract. Retain all historical
-- contract links, counts, events and snapshots without rewriting them.
DROP TRIGGER publish_contract_guard;
CREATE TRIGGER publish_company_guard BEFORE UPDATE OF status ON posts
WHEN NEW.status='PUBLISHED' AND OLD.status!='PUBLISHED'
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM companies WHERE id=NEW.company_id AND status='ACTIVE') THEN RAISE(ABORT,'Inactive company') END;
END;
DROP TRIGGER publish_contract_count;
CREATE TRIGGER publish_first_mark AFTER UPDATE OF status ON posts
WHEN NEW.status='PUBLISHED' AND OLD.status!='PUBLISHED' AND OLD.published_once=0
BEGIN
 UPDATE posts SET published_once=1 WHERE id=NEW.id;
END;
DROP TRIGGER post_status_guard;
CREATE TRIGGER post_status_guard BEFORE UPDATE OF status ON posts
WHEN NEW.status!=OLD.status AND NOT (
 (OLD.status='DRAFT' AND NEW.status IN ('REVIEW','PUBLISHED')) OR
 (OLD.status='REVIEW' AND NEW.status IN ('DRAFT','APPROVED')) OR
 (OLD.status='APPROVED' AND NEW.status IN ('DRAFT','PUBLISHED')) OR
 (OLD.status='PUBLISHED' AND NEW.status='DRAFT')
)
BEGIN SELECT RAISE(ABORT,'Invalid post status transition'); END;
