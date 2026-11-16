ALTER TABLE companies ADD COLUMN naver_place_url TEXT;
ALTER TABLE companies ADD COLUMN naver_place_name TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN naver_place_address TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN naver_place_hours TEXT NOT NULL DEFAULT '';
