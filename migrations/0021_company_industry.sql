-- Older companies may remain unassigned until their industry is confirmed.
ALTER TABLE companies ADD COLUMN primary_service_id INTEGER REFERENCES services(id);
CREATE INDEX companies_primary_service ON companies(primary_service_id);

CREATE TRIGGER company_active_service_insert BEFORE INSERT ON companies
WHEN NEW.primary_service_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM services WHERE id=NEW.primary_service_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT,'Company industry is unavailable'); END;
CREATE TRIGGER company_active_service_update BEFORE UPDATE OF primary_service_id ON companies
WHEN NEW.primary_service_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM services WHERE id=NEW.primary_service_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT,'Company industry is unavailable'); END;
CREATE TRIGGER archive_company_service_in_use BEFORE UPDATE OF deleted_at ON services
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND
 EXISTS(SELECT 1 FROM companies WHERE primary_service_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'Service is assigned to a company'); END;
