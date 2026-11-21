ALTER TABLE posts ADD COLUMN work_notes TEXT NOT NULL DEFAULT '' CHECK(length(work_notes)<=2000);

DROP TRIGGER published_snapshot;
CREATE TRIGGER published_snapshot BEFORE UPDATE OF status ON posts
WHEN OLD.status='PUBLISHED' AND NEW.status='DRAFT'
BEGIN
 INSERT INTO post_snapshots(post_id,actor_id,post_version,snapshot) VALUES(OLD.id,NEW.last_actor_id,OLD.version,
 json_object('title',OLD.title,'summary',OLD.summary,'content',json(OLD.content),'company_id',OLD.company_id,
 'region_id',OLD.region_id,'service_id',OLD.service_id,'contract_id',OLD.contract_id,'post_type',OLD.post_type,
 'published_at',OLD.published_at,'sample',OLD.sample,'related_keyword',OLD.related_keyword,'page_copy',json(OLD.page_copy),
 'work_notes',OLD.work_notes,
 'images',json((SELECT COALESCE(json_group_array(json_object('id',id,'storage_key',storage_key,'thumbnail_key',thumbnail_key,
 'alt_text',alt_text,'sort_order',sort_order,'excluded',excluded)), '[]') FROM post_images WHERE post_id=OLD.id))));
END;
