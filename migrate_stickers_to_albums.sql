-- 1. Add column user_album_id
ALTER TABLE user_stickers ADD COLUMN IF NOT EXISTS user_album_id UUID REFERENCES user_albums(id) ON DELETE CASCADE;

-- 2. Migrate data 
-- Assign existing stickers (that have NULL album) to the user's first created album.
UPDATE user_stickers us
SET user_album_id = sub.first_album_id
FROM (
    SELECT DISTINCT ON (user_id) user_id, id as first_album_id
    FROM user_albums
    ORDER BY user_id, created_at ASC
) sub
WHERE us.user_id = sub.user_id
AND us.user_album_id IS NULL;

-- 3. Drop old unique constraint (on user_id, sticker_number)
-- Note: The name might vary. If this fails, check the constraint name in Supabase dashboard.
-- Common default name format: table_column_key
ALTER TABLE user_stickers DROP CONSTRAINT IF EXISTS user_stickers_user_id_sticker_number_key;

-- 4. Add new unique constraint (on user_album_id, sticker_number)
-- This ensures uniqueness per album, allowing the same user to have the same sticker in different albums.
-- We only apply this where user_album_id is NOT NULL.
ALTER TABLE user_stickers ADD CONSTRAINT user_stickers_user_album_id_sticker_number_key UNIQUE (user_album_id, sticker_number);
