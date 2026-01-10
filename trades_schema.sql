-- Create TRADES table
create table if not exists trades (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id) not null,
  receiver_id uuid references auth.users(id) not null,
  offer_stickers jsonb not null, -- Array of numbers [1, 50, 100]
  request_stickers jsonb not null, -- Array of numbers [2, 60]
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for Trades
alter table trades enable row level security;

create policy "Users can view trades they are involved in"
  on trades for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can create trades"
  on trades for insert
  with check (auth.uid() = sender_id);

create policy "Users can update trades they are involved in"
  on trades for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
