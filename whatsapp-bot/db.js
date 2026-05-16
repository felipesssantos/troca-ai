import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

export async function getUserByPhone(phone) {
    // Lidar com o 9º dígito do Brasil
    let variations = [phone];
    if (phone.startsWith('55') && phone.length === 12) {
        // Veio sem o 9 (ex: 551188887777), vamos adicionar o 9
        const ddd = phone.substring(2, 4);
        const number = phone.substring(4);
        variations.push(`55${ddd}9${number}`);
    } else if (phone.startsWith('55') && phone.length === 13) {
        // Veio com o 9 (ex: 5511988887777), vamos tentar sem o 9 também
        const ddd = phone.substring(2, 4);
        const number = phone.substring(5);
        variations.push(`55${ddd}${number}`);
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .in('whatsapp_number', variations)
        .limit(1);
    
    if (error) {
        throw error;
    }
    return data && data.length > 0 ? data[0] : null;
}

export async function getUserByProfilePhone(phone) {
    let variations = [phone];
    if (phone.startsWith('55') && phone.length === 12) {
        const ddd = phone.substring(2, 4);
        const number = phone.substring(4);
        variations.push(`55${ddd}9${number}`);
    } else if (phone.startsWith('55') && phone.length === 13) {
        const ddd = phone.substring(2, 4);
        const number = phone.substring(5);
        variations.push(`55${ddd}${number}`);
    } else if (phone.length === 10) {
        // Without 55 and without 9: 7588887777 -> 75988887777
        const ddd = phone.substring(0, 2);
        const number = phone.substring(2);
        variations.push(`${ddd}9${number}`);
        variations.push(`55${phone}`);
        variations.push(`55${ddd}9${number}`);
    } else if (phone.length === 11) {
        // Without 55 and with 9: 75988887777 -> 7588887777
        const ddd = phone.substring(0, 2);
        const number = phone.substring(3);
        variations.push(`${ddd}${number}`);
        variations.push(`55${phone}`);
        variations.push(`55${ddd}${number}`);
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .in('phone', variations)
        .limit(1);
    
    if (error) {
        throw error;
    }
    return data && data.length > 0 ? data[0] : null;
}

export async function linkWhatsAppNumber(userId, whatsappNumber) {
    const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_number: whatsappNumber })
        .eq('id', userId);
        
    if (error) throw error;
}

export async function getUserAlbums(userId) {
    const { data, error } = await supabase
        .from('user_albums')
        .select(`
            id,
            nickname,
            album_template_id,
            albums (name, total_stickers)
        `)
        .eq('user_id', userId);
        
    if (error) throw error;
    return data;
}

export async function processStickers(userId, userAlbumId, albumTemplateId, codesArray, isAdding) {
    // 1. First, we need to map the 'codesArray' (e.g. ['BRA 1', 'MEX 10']) to actual sticker_number
    // We fetch the metadata for the specific album template
    const { data: metadata, error: metaError } = await supabase
        .from('stickers')
        .select('sticker_number, display_code')
        .eq('album_id', albumTemplateId);
        
    if (metaError) throw metaError;

    // Normalize codes for comparison
    const normalize = (c) => c.replace(/\s/g, '').toLowerCase();
    
    const validStickers = [];
    const notFound = [];

    for (const code of codesArray) {
        const normalizedInput = normalize(code);
        const match = metadata.find(m => normalize(m.display_code) === normalizedInput);
        if (match) {
            validStickers.push(match);
        } else {
            notFound.push(code);
        }
    }

    if (validStickers.length === 0) {
        return { success: false, notFound };
    }

    // 2. Get current counts for these stickers
    const validStickerNumbers = validStickers.map(s => s.sticker_number);
    const { data: currentDistricts, error: distError } = await supabase
        .from('user_stickers')
        .select('sticker_number, count')
        .eq('user_id', userId)
        .eq('user_album_id', userAlbumId)
        .in('sticker_number', validStickerNumbers);

    if (distError) throw distError;

    const currentMap = {};
    currentDistricts?.forEach(d => {
        currentMap[d.sticker_number] = d.count;
    });

    // 3. Prepare upsert operations
    const upsertsMap = {};
    const notOwned = [];
    const addedNew = [];
    const addedRepeated = [];
    
    for (const sticker of validStickers) {
        let currentCount = currentMap[sticker.sticker_number] || 0;
        
        if (!isAdding && currentCount === 0) {
            notOwned.push(sticker.display_code);
        } else {
            let newCount = isAdding ? currentCount + 1 : currentCount - 1;
            
            // Atualiza o mapa na memória para a próxima iteração do loop
            // Isso previne o bug de considerar a mesma figurinha como "Nova" duas vezes
            currentMap[sticker.sticker_number] = newCount; 
            
            if (isAdding) {
                if (currentCount === 0) {
                    addedNew.push(sticker.display_code);
                } else {
                    addedRepeated.push(sticker.display_code);
                }
            }

            // Grava o último valor atualizado para o upsert no banco
            upsertsMap[sticker.sticker_number] = newCount;
        }
    }

    const upserts = Object.keys(upsertsMap).map(stickerNum => ({
        user_id: userId,
        user_album_id: userAlbumId,
        sticker_number: parseInt(stickerNum),
        count: upsertsMap[stickerNum]
    }));

    // 4. Upsert to database
    if (upserts.length > 0) {
        const { error: upsertError } = await supabase
            .from('user_stickers')
            .upsert(upserts, { onConflict: 'user_album_id, sticker_number' });

        if (upsertError) throw upsertError;
    }

    return { 
        success: true, 
        processed: upserts.length, 
        notFound,
        notOwned,
        addedNew,
        addedRepeated
    };
}
