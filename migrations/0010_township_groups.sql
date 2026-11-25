-- Preserve original codes and URLs. Group keys describe a union of numbered dongs.
ALTER TABLE regions ADD COLUMN group_key TEXT;
CREATE UNIQUE INDEX regions_group_key_unique ON regions(group_key) WHERE group_key IS NOT NULL;
