-- DATABASE SCHEMA FOR NATION OF NICHES (NaNi)
-- Copy and paste this directly into the Supabase SQL Editor to set up your project tables, buckets, and policies.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 0. CLEAN RESET (Drops old tables, views & triggers to guarantee run success)
-- ------------------------------------------------------------
drop view if exists public.trending_posts_ranked cascade;
drop table if exists public.user_niche_scores cascade;
drop table if exists public.search_queries cascade;
drop table if exists public.shares cascade;
drop table if exists public.impressions cascade;
drop table if exists public.bookmarks cascade;
drop table if exists public.nano_categories cascade;
drop table if exists public.post_categories cascade;
drop table if exists public.categories cascade;
drop table if exists public.notifications cascade;
drop table if exists public.follows cascade;
drop table if exists public.likes cascade;
drop table if exists public.comments cascade;
drop table if exists public.nanos cascade;
drop table if exists public.posts cascade;
drop table if exists public.profiles cascade;

-- Remove outstanding triggers on external schemas
drop trigger if exists on_auth_user_created on auth.users;

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  banner_index integer default 1,
  link text,
  is_creator boolean default false,
  first_name text,
  last_name text,
  email text,
  phone text,
  gender text,
  birthday date,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
drop policy if exists "Allow public read access to profiles" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Allow users to update their own profile" on public.profiles;
drop policy if exists "Users can update their own profiles" on public.profiles;
drop policy if exists "Allow users to insert their own profile" on public.profiles;
drop policy if exists "Users can insert their own profiles" on public.profiles;

create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Allow users to insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ------------------------------------------------------------
-- 2. POSTS TABLE
-- ------------------------------------------------------------
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  captured_image text,             -- Base64 or direct URL to bucket
  image_gradient text,             -- Fallback styling
  likes_count integer default 0,
  comments_count integer default 0,
  sound text,
  is_quote boolean default false,
  type text default 'post' check (type in ('post', 'note', 'music')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.posts enable row level security;

-- Policies
create policy "Allow public read access to posts" on public.posts
  for select using (true);

create policy "Allow authenticated users to insert posts" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "Allow users to delete their own posts" on public.posts
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. NANOS TABLE (Tiktok/Reels styled gradient/video loops)
-- ------------------------------------------------------------
create table public.nanos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  caption text,
  gradient text,
  sound text,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.nanos enable row level security;

-- Policies
create policy "Allow public read access to nanos" on public.nanos
  for select using (true);

create policy "Allow authenticated users to insert nanos" on public.nanos
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. COMMENTS TABLE
-- ------------------------------------------------------------
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade,
  nano_id uuid references public.nanos(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint comments_target_check check (
    (post_id is not null and nano_id is null) or 
    (post_id is null and nano_id is not null)
  )
);

-- Enable RLS
alter table public.comments enable row level security;

-- Policies
create policy "Allow public read access to comments" on public.comments
  for select using (true);

create policy "Allow authenticated users to post comments" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "Allow users to delete their own comments" on public.comments
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. LIKES TABLE (Unique pairs of user and content)
-- Using a surrogate primary key and partial indexes to prevent nullable primary key bugs
-- ------------------------------------------------------------
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade,
  nano_id uuid references public.nanos(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint likes_target_check check (
    (post_id is not null and nano_id is null) or 
    (post_id is null and nano_id is not null)
  )
);

-- Prevent double likes using partial indexes (so NULLs don''t bypass unique check)
create unique index likes_user_post_unique_idx on public.likes (user_id, post_id) where post_id is not null;
create unique index likes_user_nano_unique_idx on public.likes (user_id, nano_id) where nano_id is not null;

-- Enable RLS
alter table public.likes enable row level security;

-- Policies
create policy "Allow public read access to likes" on public.likes
  for select using (true);

create policy "Allow authenticated users to toggle likes" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "Allow users to remove their likes" on public.likes
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. FOLLOWS TABLE
-- ------------------------------------------------------------
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id),
  constraint self_follow_check check (follower_id <> following_id)
);

-- Enable RLS
alter table public.follows enable row level security;

-- Policies
create policy "Allow public read to follows" on public.follows
  for select using (true);

create policy "Allow users to follow others" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "Allow users to unfollow others" on public.follows
  for delete using (auth.uid() = follower_id);

-- ------------------------------------------------------------
-- 7. NOTIFICATIONS TABLE
-- ------------------------------------------------------------
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('like', 'comment', 'follow')),
  post_id uuid references public.posts(id) on delete cascade,
  nano_id uuid references public.nanos(id) on delete cascade,
  message text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Allow users to read their own notifications" on public.notifications
  for select using (auth.uid() = recipient_id);

create policy "Allow system/authenticated to trigger notifications" on public.notifications
  for insert with check (auth.uid() = sender_id);

create policy "Allow users to update notice read status" on public.notifications
  for update using (auth.uid() = recipient_id);

-- ------------------------------------------------------------
-- 8. STORAGE BUCKET CONFIGURATION FOR MEDIA (POSTS, AVATARS, VIDEOS)
-- Note: Storage buckets are declared dynamically inside a block to prevent failures if Storage schema is not ready.
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) 
    values ('nani_media', 'nani_media', true)
    on conflict (id) do nothing;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute 'drop policy if exists "Allow public access to media objects" on storage.objects';
    execute 'create policy "Allow public access to media objects" on storage.objects for select using (bucket_id = ''nani_media'')';
    
    execute 'drop policy if exists "Allow authenticated uploads to media objects" on storage.objects';
    execute 'create policy "Allow authenticated uploads to media objects" on storage.objects for insert with check (bucket_id = ''nani_media'' and auth.role() = ''authenticated'')';
    
    execute 'drop policy if exists "Allow users to delete their own media objects" on storage.objects';
    execute 'create policy "Allow users to delete their own media objects" on storage.objects for delete using (bucket_id = ''nani_media'' and auth.uid() = owner)';
  end if;
end $$;

-- ------------------------------------------------------------
-- 9. AUTOMATIC TRIGGER FOR CREATING PROFILE FROM AUTH USER
-- This trigger automatically inserts a record into public.profiles
-- whenever a user signs up via Supabase Auth.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_username text;
begin
  -- Resolve username from metadata or fall back to email split
  raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- Format name into letters, numbers, periods and underscores
  raw_username := lower(regexp_replace(raw_username, '[^a-zA-Z0-9_.]', '', 'g'));
  
  -- Prevent exact duplicates by appending random tail if conflicts
  if exists (select 1 from public.profiles where username = raw_username) then
    raw_username := raw_username || '_' || substring(md5(random()::text) from 1 for 4);
  end if;

  insert into public.profiles (
    id, 
    username, 
    display_name, 
    bio, 
    avatar_url, 
    is_creator,
    first_name,
    last_name,
    email,
    phone,
    gender,
    birthday,
    location
  )
  values (
    new.id,
    raw_username,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'Hi! I am new here on nation of niches.',
    new.raw_user_meta_data->>'avatar_url',
    false,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.email,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    new.raw_user_meta_data->>'gender',
    case 
      when new.raw_user_meta_data->>'birthday' is not null and new.raw_user_meta_data->>'birthday' ~ '^\d{4}-\d{2}-\d{2}$' 
      then (new.raw_user_meta_data->>'birthday')::date 
      else null 
    end,
    new.raw_user_meta_data->>'location'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any to prevent creation collision errors
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 10. CATEGORIES & POST_TAGS TABLE (For Recommendation & Niche Categorization)
-- ------------------------------------------------------------
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  slug text unique not null,
  description text,
  icon text, -- lucide icon identifier
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed pre-defined popular niches to make recommendations look rich out of the box
insert into public.categories (name, slug, description, icon) values
  ('Cyberpunk Design', 'cyberpunk-design', 'High-tech, low life aesthetics and sleek neon designs.', 'Cpu'),
  ('Ambient Beats', 'ambient-beats', 'Soothe your soul with lo-fi rhythms and smooth generative pads.', 'Music'),
  ('Minimalist Spaces', 'minimalist-spaces', 'Curated architectural grids, empty negative spaces, and sleek decors.', 'Layout'),
  ('Analog Photography', 'analog-photography', 'Grainy film rolls, vintage cameras, and nostalgic light leaks.', 'Camera'),
  ('Generative AI Craft', 'generative-ai', 'The bleeding edge of AI generation, prompts, and synthetic art.', 'Sparkles'),
  ('Indie Dev Journal', 'indie-dev', 'Solo dev builds, shipping roadmaps, and dev logs.', 'Code')
on conflict (slug) do nothing;

create table public.post_categories (
  post_id uuid references public.posts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (post_id, category_id)
);

create table public.nano_categories (
  nano_id uuid references public.nanos(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (nano_id, category_id)
);

-- Enable RLS and add select policy for public reading of categorization
alter table public.categories enable row level security;
alter table public.post_categories enable row level security;
alter table public.nano_categories enable row level security;

create policy "Allow public read to categories" on public.categories for select using (true);
create policy "Allow public read to post_categories" on public.post_categories for select using (true);
create policy "Allow public read to nano_categories" on public.nano_categories for select using (true);

-- Allow authorized users to categorize their own content
create policy "Allow authenticated users to categorize posts" on public.post_categories
  for insert with check (
    exists (
      select 1 from public.posts 
      where posts.id = post_id and posts.user_id = auth.uid()
    )
  );

create policy "Allow authenticated users to categorize nanos" on public.nano_categories
  for insert with check (
    exists (
      select 1 from public.nanos 
      where nanos.id = nano_id and nanos.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 11. BOOKMARKS / SAVES TABLE (High-Intent Personal Signal)
-- Using a surrogate primary key and partial indexes to prevent nullable primary key bugs
-- ------------------------------------------------------------
create table public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade,
  nano_id uuid references public.nanos(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint bookmarks_target_check check (
    (post_id is not null and nano_id is null) or 
    (post_id is null and nano_id is not null)
  )
);

create unique index bookmarks_user_post_unique_idx on public.bookmarks (user_id, post_id) where post_id is not null;
create unique index bookmarks_user_nano_unique_idx on public.bookmarks (user_id, nano_id) where nano_id is not null;

alter table public.bookmarks enable row level security;

create policy "Allow users to read their own bookmarks" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "Allow authenticated users to add bookmarks" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "Allow users to delete their own bookmarks" on public.bookmarks
  for delete using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 12. IMPRESSIONS & VIEWS LOGS (Required for CTR, Recommendations & Dwell Analysis)
-- ------------------------------------------------------------
create table public.impressions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- can be null for anonymous previews
  post_id uuid references public.posts(id) on delete cascade,
  nano_id uuid references public.nanos(id) on delete cascade,
  dwell_time_ms integer default 0, -- Time user spent viewing the post in milliseconds
  is_clicked boolean default false, -- Clicking/expanding/playing details
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint impressions_target_check check (
    (post_id is not null and nano_id is null) or 
    (post_id is null and nano_id is not null)
  )
);

alter table public.impressions enable row level security;

-- Performance: Anybody can count total hits, but only authenticated users get to log them
create policy "Allow public read access to impressions" on public.impressions
  for select using (true);

create policy "Allow public and authenticated to write impressions" on public.impressions
  for insert with check (true);


-- ------------------------------------------------------------
-- 13. SHARES LOGS TABLE (High Value Engagement Weight)
-- ------------------------------------------------------------
create table public.shares (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- null for guests
  post_id uuid references public.posts(id) on delete cascade,
  nano_id uuid references public.nanos(id) on delete cascade,
  destination text check (destination in ('copy_link', 'direct', 'external')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint shares_target_check check (
    (post_id is not null and nano_id is null) or 
    (post_id is null and nano_id is not null)
  )
);

alter table public.shares enable row level security;

create policy "Allow public read of share records" on public.shares for select using (true);
create policy "Allow insert share logs" on public.shares for insert with check (true);


-- ------------------------------------------------------------
-- 14. SEARCH_QUERIES LOG TABLE (Interest & Content Mapping)
-- ------------------------------------------------------------
create table public.search_queries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  query_text text not null,
  clicked_profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.search_queries enable row level security;

create policy "Allow users to see their own query logs" on public.search_queries
  for select using (auth.uid() = user_id);

create policy "Allow insertion of search queries" on public.search_queries
  for insert with check (auth.uid() = user_id or user_id is null);


-- ------------------------------------------------------------
-- 15. USER PROFILE PREFERENCE SCORE (Pre-calculated user interests vectors)
-- This table aggregates user engagement scores across categories for high-speed personalization
-- ------------------------------------------------------------
create table public.user_niche_scores (
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  affinity_score numeric(6,3) default 0.000 not null, -- higher score = higher recommended interest
  last_calculated timestamp with time zone default now() not null,
  primary key (user_id, category_id)
);

alter table public.user_niche_scores enable row level security;
create policy "Allow users to view their own niche scores" on public.user_niche_scores
  for select using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 16. TRENDING RANKING ALGORITHM (Hacker News / Reddit Score Generator)
-- We supply an advanced ranking view calculating engagement decaying with time.
-- Formula: Hot_Score = (Likes * 1.5 + Comments * 3.0 + Bookmarks * 4.5 + Shares * 6.0) / (Age_In_Hours + 2) ^ 1.8
-- ------------------------------------------------------------
create or replace view public.trending_posts_ranked as
select 
  p.id as post_id,
  p.user_id,
  p.content,
  p.captured_image,
  p.image_gradient,
  p.sound,
  p.is_quote,
  p.type,
  p.created_at,
  coalesce(count(distinct l.id), 0) as calculated_likes,
  coalesce(count(distinct c.id), 0) as calculated_comments,
  coalesce(count(distinct b.id), 0) as calculated_bookmarks,
  coalesce(count(distinct s.id), 0) as calculated_shares,
  coalesce(count(distinct i.id), 0) as calculated_impressions,
  (
    (
      (coalesce(count(distinct l.id), 0) * 1.5) +
      (coalesce(count(distinct c.id), 0) * 3.0) +
      (coalesce(count(distinct b.id), 0) * 4.5) +
      (coalesce(count(distinct s.id), 0) * 6.0)
    ) / 
    coalesce(
      pow(
        (extract(epoch from (now() - p.created_at)) / 3600.0) + 2.0,
        1.8
      ),
      1.0
    )
  ) as hot_rank_score
from public.posts p
left join public.likes l on l.post_id = p.id
left join public.comments c on c.post_id = p.id
left join public.bookmarks b on b.post_id = p.id
left join public.shares s on s.post_id = p.id
left join public.impressions i on i.post_id = p.id
group by p.id;


-- ------------------------------------------------------------
-- 17. REFRESH PROFILE STATS/TRIGGERS TO AUTOMATICALLY UPDATE COUNTS
-- Whenever a comment or like is added, update count cache inside posts or nanos table!
-- ------------------------------------------------------------
create or replace function public.increment_post_counters()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.post_id is not null then
      update public.posts
      set likes_count = (select count(*) from public.likes where post_id = NEW.post_id),
          comments_count = (select count(*) from public.comments where post_id = NEW.post_id)
      where id = NEW.post_id;
    elsif NEW.nano_id is not null then
      update public.nanos
      set likes_count = (select count(*) from public.likes where nano_id = NEW.nano_id),
          comments_count = (select count(*) from public.comments where nano_id = NEW.nano_id)
      where id = NEW.nano_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.post_id is not null then
      update public.posts
      set likes_count = (select count(*) from public.likes where post_id = OLD.post_id),
          comments_count = (select count(*) from public.comments where post_id = OLD.post_id)
      where id = OLD.post_id;
    elsif OLD.nano_id is not null then
      update public.nanos
      set likes_count = (select count(*) from public.likes where nano_id = OLD.nano_id),
          comments_count = (select count(*) from public.comments where nano_id = OLD.nano_id)
      where id = OLD.nano_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Auto sync likes triggers for accurate ranking fields
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.increment_post_counters();

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure public.increment_post_counters();


-- ------------------------------------------------------------
-- 18. RPC LIKE FUNCTIONS FOR HIGH PERFORMANCE CLIENT CALLS
-- Self-healing counter updates based on real physical row count
-- ------------------------------------------------------------
create or replace function public.increment_post_likes(row_id uuid)
returns json as $$
declare
  updated_row public.posts;
begin
  update public.posts
  set likes_count = (select count(*) from public.likes where post_id = row_id)
  where id = row_id
  returning * into updated_row;
  
  return row_to_json(updated_row);
end;
$$ language plpgsql security definer;

create or replace function public.decrement_post_likes(row_id uuid)
returns json as $$
declare
  updated_row public.posts;
begin
  update public.posts
  set likes_count = (select count(*) from public.likes where post_id = row_id)
  where id = row_id
  returning * into updated_row;
  
  return row_to_json(updated_row);
end;
$$ language plpgsql security definer;
