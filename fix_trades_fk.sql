-- Fix Foreign Keys to point to PROFILES instead of AUTH.USERS
-- This allows Supabase client to easily join 'trades' with 'profiles' (username, avatar)

alter table trades
drop constraint if exists trades_sender_id_fkey,
drop constraint if exists trades_receiver_id_fkey;

alter table trades
add constraint trades_sender_id_fkey 
foreign key (sender_id) 
references public.profiles(id);

alter table trades
add constraint trades_receiver_id_fkey 
foreign key (receiver_id) 
references public.profiles(id);
