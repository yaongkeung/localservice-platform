ALTER TABLE posts ADD COLUMN contact_phone TEXT;
ALTER TABLE companies ADD COLUMN customer_reviews TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(customer_reviews));
ALTER TABLE companies ADD COLUMN review_source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN reviews_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(reviews_confirmed IN (0,1));
