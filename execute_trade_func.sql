-- Function to execute a trade transactionally
create or replace function execute_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  t_record record;
  s_num int;
  element jsonb;
begin
  -- 1. Get trade info
  select * into t_record from trades where id = p_trade_id;
  
  if not found then
    raise exception 'Trade not found';
  end if;

  if t_record.status <> 'pending' then
    raise exception 'Proposta não está pendente';
  end if;

  -- 2. Process OFFER stickers (Sender gives to Receiver)
  -- Sender loses 1, Receiver gains 1
  for element in select * from jsonb_array_elements(t_record.offer_stickers)
  loop
    s_num := element::int;
    
    -- Decrement Sender
    update user_stickers 
    set count = count - 1 
    where user_id = t_record.sender_id and sticker_number = s_num;
    
    -- Increment Receiver (Upsert)
    insert into user_stickers (user_id, sticker_number, count)
    values (t_record.receiver_id, s_num, 1)
    on conflict (user_id, sticker_number)
    do update set count = user_stickers.count + 1;
  end loop;

  -- 3. Process REQUEST stickers (Receiver gives to Sender)
  for element in select * from jsonb_array_elements(t_record.request_stickers)
  loop
    s_num := element::int;
    
    -- Decrement Receiver
    update user_stickers 
    set count = count - 1 
    where user_id = t_record.receiver_id and sticker_number = s_num;
    
    -- Increment Sender (Upsert)
    insert into user_stickers (user_id, sticker_number, count)
    values (t_record.sender_id, s_num, 1)
    on conflict (user_id, sticker_number)
    do update set count = user_stickers.count + 1;
  end loop;

  -- 4. Update Status
  update trades set status = 'accepted' where id = p_trade_id;

end;
$$;
