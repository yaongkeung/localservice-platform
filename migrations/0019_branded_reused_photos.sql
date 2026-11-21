ALTER TABLE post_images ADD COLUMN source_hash TEXT;
ALTER TABLE post_images ADD COLUMN source_storage_key TEXT;
ALTER TABLE post_images ADD COLUMN source_thumbnail_key TEXT;
ALTER TABLE post_images ADD COLUMN branding TEXT;
DROP INDEX active_image_hash_unique;
CREATE UNIQUE INDEX active_image_hash_unique ON post_images(post_id,COALESCE(source_hash,content_hash))
 WHERE excluded=0 AND COALESCE(source_hash,content_hash) IS NOT NULL;
CREATE INDEX post_image_source_lookup ON post_images(COALESCE(source_hash,content_hash)) WHERE excluded=0;
