-- Preserve the original contract decision when an already-published trial page
-- is explicitly converted into a real page. New real publications still require
-- an available contract; existing contract counts and immutable links stay intact.
DROP TRIGGER publish_contract_guard;
CREATE TRIGGER publish_contract_guard BEFORE UPDATE OF status ON posts
WHEN NEW.status='PUBLISHED' AND OLD.status!='PUBLISHED'
BEGIN
 SELECT CASE WHEN (SELECT status FROM companies WHERE id=NEW.company_id)!='ACTIVE' THEN RAISE(ABORT,'Inactive company') END;
 SELECT CASE WHEN OLD.published_once=0 AND (SELECT sample FROM companies WHERE id=NEW.company_id)=0 AND NEW.contract_id IS NULL THEN RAISE(ABORT,'Contract required') END;
 SELECT CASE WHEN OLD.published_once=0 AND NEW.contract_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM contracts c WHERE c.id=NEW.contract_id AND c.company_id=NEW.company_id AND c.status='ACTIVE'
  AND (c.start_date IS NULL OR c.start_date<=NEW.published_at) AND (c.end_date IS NULL OR c.end_date>=NEW.published_at)
  AND c.published_quantity<c.contract_quantity
 ) THEN RAISE(ABORT,'Contract unavailable or full') END;
END;
