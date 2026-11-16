ALTER TABLE posts ADD COLUMN search_region TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN search_keyword TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN generation_reviewed INTEGER NOT NULL DEFAULT 1 CHECK(generation_reviewed IN (0,1));
CREATE TABLE draft_generations (
 id INTEGER PRIMARY KEY,
 post_id INTEGER NOT NULL REFERENCES posts(id),
 user_id INTEGER NOT NULL REFERENCES users(id),
 model TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('RUNNING','SAVED','FAILED','CONFLICT')),
 previous_content TEXT NOT NULL,
 photo_ids TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX draft_generations_daily ON draft_generations(created_at);
CREATE TRIGGER generated_draft_needs_review BEFORE UPDATE OF status ON posts
WHEN NEW.status IN ('REVIEW','APPROVED','PUBLISHED') AND NEW.generation_reviewed=0
BEGIN SELECT RAISE(ABORT,'generated draft needs review'); END;
