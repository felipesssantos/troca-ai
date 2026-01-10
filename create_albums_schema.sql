-- Create albums templates table
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    total_stickers INTEGER NOT NULL,
    cover_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_albums instances table
CREATE TABLE IF NOT EXISTS user_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    album_template_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
    nickname TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed defaults
INSERT INTO albums (name, slug, total_stickers, cover_image)
VALUES ('Copa 2026 🇧🇷', 'copa-2026', 670, NULL)
ON CONFLICT (slug) DO NOTHING;
