-- 1. Add columns to trades table (Safe to re-run due to IF NOT EXISTS)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS sender_album_id UUID REFERENCES user_albums(id) ON DELETE CASCADE;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS receiver_album_id UUID REFERENCES user_albums(id) ON DELETE CASCADE;

-- 2. Update execute_trade Function (Fixed for JSONB arrays AND RLS)
-- SECURITY DEFINER: Runs with privileges of the function creator (admin), bypassing RLS checks.
CREATE OR REPLACE FUNCTION execute_trade(p_trade_id UUID, p_receiver_album_id UUID)
RETURNS VOID 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_trade RECORD;
    v_sticker INT;
BEGIN
    -- Get trade info
    SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;

    IF v_trade.status != 'pending' THEN
        RAISE EXCEPTION 'Trade is not pending';
    END IF;

    -- Update Receiver Album ID
    UPDATE trades SET receiver_album_id = p_receiver_album_id WHERE id = p_trade_id;

    -- 1. Deduct Offer Stickers from Sender's Album
    FOR v_sticker IN SELECT value::int FROM jsonb_array_elements_text(v_trade.offer_stickers) LOOP
        UPDATE user_stickers 
        SET count = count - 1 
        WHERE user_id = v_trade.sender_id 
        AND user_album_id = v_trade.sender_album_id
        AND sticker_number = v_sticker;
    END LOOP;

    -- 2. Add Offer Stickers to Receiver's Album
    FOR v_sticker IN SELECT value::int FROM jsonb_array_elements_text(v_trade.offer_stickers) LOOP
        INSERT INTO user_stickers (user_id, user_album_id, sticker_number, count)
        VALUES (v_trade.receiver_id, p_receiver_album_id, v_sticker, 1)
        ON CONFLICT (user_album_id, sticker_number) 
        DO UPDATE SET count = user_stickers.count + 1;
    END LOOP;

    -- 3. Deduct Request Stickers from Receiver's Album
    FOR v_sticker IN SELECT value::int FROM jsonb_array_elements_text(v_trade.request_stickers) LOOP
        UPDATE user_stickers 
        SET count = count - 1 
        WHERE user_id = v_trade.receiver_id 
        AND user_album_id = p_receiver_album_id
        AND sticker_number = v_sticker;
    END LOOP;

    -- 4. Add Request Stickers to Sender's Album
    FOR v_sticker IN SELECT value::int FROM jsonb_array_elements_text(v_trade.request_stickers) LOOP
        INSERT INTO user_stickers (user_id, user_album_id, sticker_number, count)
        VALUES (v_trade.sender_id, v_trade.sender_album_id, v_sticker, 1)
        ON CONFLICT (user_album_id, sticker_number) 
        DO UPDATE SET count = user_stickers.count + 1;
    END LOOP;

    -- Update status
    UPDATE trades SET status = 'accepted' WHERE id = p_trade_id;
END;
$$ LANGUAGE plpgsql;
