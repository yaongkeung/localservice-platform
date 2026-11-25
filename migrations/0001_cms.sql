PRAGMA foreign_keys = ON;
CREATE TABLE users (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, login_id TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','ADMIN','EDITOR')),
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DISABLED')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE companies (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, description TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'ACTIVE', area TEXT NOT NULL DEFAULT '', hours TEXT NOT NULL DEFAULT '',
 sample INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE contracts (
 id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL REFERENCES companies(id), package_name TEXT NOT NULL,
 contract_quantity INTEGER NOT NULL CHECK(contract_quantity>=0), published_quantity INTEGER NOT NULL DEFAULT 0,
 start_date TEXT, end_date TEXT, price INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE regions (
 id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES regions(id), level INTEGER NOT NULL,
 name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, admin_code TEXT
);
CREATE TABLE services (
 id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES services(id), name TEXT NOT NULL,
 slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '🔧', tone TEXT NOT NULL DEFAULT 'sky'
);
CREATE TABLE company_assignments (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), company_id INTEGER NOT NULL REFERENCES companies(id),
 UNIQUE(user_id,company_id)
);
CREATE TABLE posts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES companies(id), writer_id INTEGER REFERENCES users(id),
 region_id INTEGER NOT NULL REFERENCES regions(id), service_id INTEGER NOT NULL REFERENCES services(id),
 post_type TEXT NOT NULL CHECK(post_type IN ('작업사례','서비스안내','지역정보','작업팁')),
 title TEXT NOT NULL, summary TEXT NOT NULL, content TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','REVIEW','APPROVED','PUBLISHED')),
 published_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 seo_title TEXT, seo_description TEXT, view_count INTEGER NOT NULL DEFAULT 0, call_count INTEGER NOT NULL DEFAULT 0,
 sample INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
 title_hash TEXT NOT NULL, content_hash TEXT NOT NULL, last_actor_id INTEGER REFERENCES users(id),
 CHECK(status!='PUBLISHED' OR published_at IS NOT NULL)
);
CREATE INDEX posts_public ON posts(status,published_at);
CREATE INDEX posts_company ON posts(company_id,status);
CREATE UNIQUE INDEX published_title_unique ON posts(title_hash) WHERE status='PUBLISHED';
CREATE UNIQUE INDEX published_content_unique ON posts(content_hash) WHERE status='PUBLISHED';
CREATE TABLE post_images (
 id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id), storage_key TEXT NOT NULL,
 thumbnail_key TEXT, alt_text TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, sample INTEGER NOT NULL DEFAULT 0,
 content_hash TEXT
);
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE TABLE post_events (
 id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id), user_id INTEGER NOT NULL REFERENCES users(id),
 from_status TEXT NOT NULL, to_status TEXT NOT NULL, version INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- A trigger enforces the workflow even if writes bypass the application.
CREATE TRIGGER post_status_guard BEFORE UPDATE OF status ON posts
WHEN NEW.status!=OLD.status AND NOT (
 (OLD.status='DRAFT' AND NEW.status='REVIEW') OR
 (OLD.status='REVIEW' AND NEW.status IN ('DRAFT','APPROVED')) OR
 (OLD.status='APPROVED' AND NEW.status IN ('DRAFT','PUBLISHED'))
)
BEGIN SELECT RAISE(ABORT,'Invalid post status transition'); END;
CREATE TRIGGER post_status_log AFTER UPDATE OF status ON posts WHEN NEW.status!=OLD.status
BEGIN
 INSERT INTO post_events(post_id,user_id,from_status,to_status,version)
 VALUES(NEW.id,NEW.last_actor_id,OLD.status,NEW.status,NEW.version);
END;
