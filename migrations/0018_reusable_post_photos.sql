-- Photos may be reused across posts; retain their original content hashes and ownership.
DROP INDEX active_image_hash_unique;
CREATE UNIQUE INDEX active_image_hash_unique ON post_images(post_id,content_hash)
 WHERE excluded=0 AND content_hash IS NOT NULL;
