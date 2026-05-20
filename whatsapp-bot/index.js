import { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import qrcodeImage from 'qrcode';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { getUserByPhone, getUserByProfilePhone, getUserAlbums, processStickers, linkWhatsAppNumber, consultMissingStickers } from './db.js';
import { sessionManager, States } from './sessionManager.js';
import { identifyStickersFromImage } from './gemini.js';

let botState = {
    status: 'DISCONNECTED',
    qr: null
};

// Express App Setup
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/whatsapp/status', (req, res) => {
    res.json(botState);
});

let globalSock = null;

app.post('/api/whatsapp/logout', async (req, res) => {
    try {
        if (globalSock) {
            await globalSock.logout();
        } else if (fs.existsSync('./auth_info_baileys')) {
            fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
            connectToWhatsApp();
        }
        botState = { status: 'DISCONNECTED', qr: null };
        res.json({ success: true, message: 'Disconnected. Restarting bot...' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[Express] API listening on port ${PORT}`);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Turn off built-in, use manual event
        logger: pino({ level: 'silent' })
    });

    globalSock = sock;

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // qrcodeTerminal.generate(qr, { small: true }); // Removed from terminal

            qrcodeImage.toDataURL(qr, (err, url) => {
                if (!err) {
                    botState = { status: 'QR_READY', qr: url };
                }
            });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            
            botState.status = 'DISCONNECTED';
            botState.qr = null;
            
            // Reconnect regardless if it's logged out or network error
            // If it was logged out, Baileys already deleted the creds, so it will generate a new QR
            connectToWhatsApp();
            
        } else if (connection === 'open') {
            console.log('Bot is ready and connected to WhatsApp!');
            botState = { status: 'CONNECTED', qr: null };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderJid = msg.key.remoteJid;
        // Extract clean phone number
        let phone = senderJid.split('@')[0].split(':')[0];
        // Baileys remoteJid often looks like 5511999999999@s.whatsapp.net
        // Let's ensure it's clean and in a predictable format for our DB lookup.
        // It's up to the user how they save it in the DB. Let's assume exactly what Baileys gives: 55...

        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const hasImage = !!(msg.message.imageMessage || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage);

        const session = sessionManager.getSession(phone);
        const reply = async (text) => {
            await sock.sendPresenceUpdate('composing', senderJid);
            const typingTime = Math.floor(Math.random() * 1500) + 1000; // 1 to 2.5 seconds
            await new Promise(resolve => setTimeout(resolve, typingTime));
            await sock.sendPresenceUpdate('paused', senderJid);
            await sock.sendMessage(senderJid, { text });
        };

        console.log(`[${phone}] State: ${session.state} | Msg: ${textMessage || (hasImage ? '[Image]' : '')}`);

        try {
            // -- STATE: IDLE --
            if (session.state === States.IDLE) {
                const user = await getUserByPhone(phone);

                if (!user) {
                    sessionManager.updateState(phone, States.AWAITING_PHONE_LINK);
                    await reply(`Olá! 👋 Bem-vindo ao assistente do Troca Aí.\n\nNotei que é a sua primeira vez interagindo comigo.\nPara vincularmos o seu WhatsApp à sua conta, por favor, digite o *número de telefone com DDD* (apenas números) que você cadastrou no aplicativo.\n\nSe ainda não tem conta, crie gratuitamente em: https://app.trocaai.net`);
                    return;
                }

                sessionManager.updateState(phone, States.AWAITING_CONFIRMATION, { user });
                await reply(`Olá! Encontrei a conta *${user.username}* vinculada a este número. É você mesmo?\n\nResponda:\n1 - Sim\n2 - Não`);
                return;
            }

            // -- STATE: AWAITING_PHONE_LINK --
            if (session.state === States.AWAITING_PHONE_LINK) {
                if (textMessage.toLowerCase() === 'cancelar' || textMessage.toLowerCase() === 'sair') {
                    sessionManager.clearSession(phone);
                    await reply("Sessão encerrada. Me mande um 'Oi' quando quiser recomeçar.");
                    return;
                }

                const typedPhone = textMessage.replace(/\D/g, ''); // remove non-digits

                if (typedPhone.length < 10) {
                    await reply("Por favor, digite um número de telefone válido com DDD (ex: 11999999999). Ou digite 'cancelar'.");
                    return;
                }

                const user = await getUserByProfilePhone(typedPhone);

                if (!user) {
                    await reply(`Não encontrei nenhuma conta no sistema com o telefone ${typedPhone}.\n\nVerifique se este é o número exato cadastrado no seu perfil em https://app.trocaai.net e tente novamente.\n\nSe preferir, digite 'cancelar' para encerrar.`);
                    return;
                }

                // Found user! Link their WhatsApp number (the LID or JID the bot sees) to their profile
                await linkWhatsAppNumber(user.id, phone);

                sessionManager.updateState(phone, States.AWAITING_CONFIRMATION, { user });
                await reply(`✅ WhatsApp vinculado com sucesso à conta *${user.username}*!\n\nAgora vamos prosseguir: é você mesmo interagindo?\n\nResponda:\n1 - Sim\n2 - Não`);
                return;
            }

            // -- STATE: AWAITING_CONFIRMATION --
            if (session.state === States.AWAITING_CONFIRMATION) {
                if (textMessage === '1' || textMessage.toLowerCase() === 'sim') {
                    const albums = await getUserAlbums(session.data.user.id);
                    if (!albums || albums.length === 0) {
                        await reply("Você ainda não tem nenhum álbum cadastrado. Crie um no aplicativo primeiro!");
                        sessionManager.clearSession(phone);
                        return;
                    }

                    let albumOptions = "Qual álbum vamos gerenciar hoje?\n";
                    albums.forEach((ua, index) => {
                        const name = ua.nickname ? `${ua.albums.name} - ${ua.nickname}` : ua.albums.name;
                        albumOptions += `\n${index + 1} - ${name}`;
                    });
                    albumOptions += "\n\nResponda com o número correspondente.";

                    sessionManager.updateState(phone, States.AWAITING_ALBUM_CHOICE, { albums });
                    await reply(albumOptions);
                } else {
                    await reply("Ok! Por favor, atualize o telefone no seu perfil do aplicativo correto e me chame de novo.");
                    sessionManager.clearSession(phone);
                }
                return;
            }

            // -- STATE: AWAITING_ALBUM_CHOICE --
            if (session.state === States.AWAITING_ALBUM_CHOICE) {
                if (textMessage.toLowerCase() === 'sair' || textMessage.toLowerCase() === 'cancelar' || textMessage.toLowerCase() === 'voltar') {
                    sessionManager.clearSession(phone);
                    await reply("Sessão encerrada. Quando precisar, é só me mandar um 'Oi' novamente!");
                    return;
                }

                const choice = parseInt(textMessage) - 1;
                const selectedAlbum = session.data.albums[choice];

                if (!selectedAlbum) {
                    await reply("Opção inválida. Responda com o número correspondente ao álbum.");
                    return;
                }

                sessionManager.updateState(phone, States.AWAITING_ACTION, { selectedAlbum });
                await reply(`Álbum selecionado: *${selectedAlbum.albums.name}*\n\nO que você deseja fazer?\n\n1 - ➕ Colar figurinhas (Adicionar)\n2 - ➖ Retirar figurinhas (Subtrair)\n3 - 🔍 Consultar figurinhas (Ver o que falta)\n\nResponda com 1, 2 ou 3.`);
                return;
            }

            // -- STATE: AWAITING_ACTION --
            if (session.state === States.AWAITING_ACTION) {
                if (textMessage.toLowerCase() === 'voltar' || textMessage.toLowerCase() === 'cancelar') {
                    // Back to album choice
                    const albums = session.data.albums;
                    let albumOptions = "Qual álbum vamos gerenciar?\n";
                    albums.forEach((ua, index) => {
                        albumOptions += `${index + 1} - ${ua.albums.name}\n`;
                    });
                    albumOptions += "\nResponda com o número correspondente. (Ou digite 'sair')";
                    sessionManager.updateState(phone, States.AWAITING_ALBUM_CHOICE);
                    await reply(albumOptions);
                    return;
                }
                
                if (textMessage.toLowerCase() === 'sair') {
                    sessionManager.clearSession(phone);
                    await reply("Sessão encerrada. Me mande um 'Oi' quando quiser recomeçar.");
                    return;
                }

                if (textMessage === '1' || textMessage === '2' || textMessage === '3') {
                    let actionType = 'ADD';
                    let actionLabel = 'ADICIONAR';
                    if (textMessage === '2') {
                        actionType = 'REMOVE';
                        actionLabel = 'REMOVER';
                    } else if (textMessage === '3') {
                        actionType = 'CONSULT';
                        actionLabel = 'CONSULTAR';
                    }
                    sessionManager.updateState(phone, States.AWAITING_PHOTO, { actionType });
                    await reply(`Perfeito! Vamos *${actionLabel}* figurinhas.\n\n📸 Me envie a *foto* das figurinhas (pode mandar várias na mesma foto).\n\n✍️ Ou se preferir, *digite os códigos* separados por vírgula (Ex: BRA 1, GER 2, ARG 10).\n\n(Ou digite 'voltar' para escolher outra ação)`);
                } else {
                    await reply("Opção inválida. Responda 1 para Adicionar, 2 para Retirar, 3 para Consultar, 'voltar' ou 'sair'.");
                }
                return;
            }

            // -- STATE: AWAITING_PHOTO --
            if (session.state === States.AWAITING_PHOTO) {
                if (!hasImage) {
                    if (textMessage.toLowerCase() === 'sair') {
                        sessionManager.clearSession(phone);
                        await reply("Sessão encerrada. Me mande um 'Oi' quando quiser recomeçar.");
                        return;
                    }
                    if (textMessage.toLowerCase() === 'cancelar' || textMessage.toLowerCase() === 'voltar') {
                        sessionManager.updateState(phone, States.AWAITING_ACTION);
                        await reply(`Álbum selecionado: *${session.data.selectedAlbum.albums.name}*\n\nO que você deseja fazer?\n1 - ➕ Colar figurinhas (Adicionar)\n2 - ➖ Retirar figurinhas (Subtrair)\n3 - 🔍 Consultar figurinhas (Ver o que falta)\n\n(Ou digite 'voltar' para trocar de álbum)`);
                        return;
                    }
                }

                let codes = [];

                if (hasImage) {
                    await reply("🔎 Analisando a imagem... Aguarde um instante.");

                    // Download image
                    const imageMessage = msg.message.imageMessage || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
                    // create a temporary mock message object to pass to downloadMediaMessage
                    const mockMessage = {
                        key: msg.key,
                        message: msg.message.imageMessage ? msg.message : msg.message.extendedTextMessage?.contextInfo?.quotedMessage
                    };

                    const buffer = await downloadMediaMessage(mockMessage, 'buffer', {}, {
                        logger: pino({ level: 'silent' }),
                        reuploadRequest: sock.updateMediaMessage
                    });

                    // Send to Gemini
                    codes = await identifyStickersFromImage(buffer, imageMessage.mimetype);
                } else {
                    // Extract codes using regex to handle missing commas and spacing
                    const matches = textMessage.match(/[A-Za-z]+\s*\d+|\d+|[A-Za-z]+/g);
                    if (matches) {
                        codes = matches;
                    }
                }

                if (!codes || codes.length === 0) {
                    await reply("😕 Não consegui identificar nenhuma figurinha. Envie uma foto clara ou digite os códigos separados por vírgula.");
                    return;
                }

                // Standardize format (uppercase and space before number)
                codes = codes.map(c => {
                    let upper = c.toUpperCase().trim();
                    return upper.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
                });

                const codesStr = codes.join(', ');

                if (session.data.actionType === 'CONSULT') {
                    // Consult mode: tell them right away, don't ask for confirmation
                    const { user, selectedAlbum } = session.data;
                    const result = await consultMissingStickers(user.id, selectedAlbum.id, selectedAlbum.album_template_id, codes);

                    let finalMessage = `🔎 **Resultado da Consulta**\nLidas na foto: ${codesStr}`;
                    
                    if (result.missing && result.missing.length > 0) {
                        finalMessage += `\n\n✨ **VOCÊ AINDA NÃO TEM (${result.missing.length})**:\n${result.missing.join(', ')}`;
                    } else {
                        finalMessage += `\n\n✅ **Você já tem todas as figurinhas dessa foto no seu álbum!**`;
                    }

                    if (result.notFound && result.notFound.length > 0) {
                        finalMessage += `\n\n⚠️ Atenção: Códigos não identificados neste álbum: ${result.notFound.join(', ')}`;
                    }

                    finalMessage += `\n\nMande outra foto ou digite os códigos para continuar consultando. (Ou digite 'voltar' para escolher outra ação, ou 'sair' para encerrar)`;

                    await reply(finalMessage);
                    return; // Stays in AWAITING_PHOTO
                }

                // Save codes in session and ask for confirmation
                sessionManager.updateState(phone, States.AWAITING_STICKER_CONFIRMATION, { identifiedCodes: codes });

                await reply(`🤖 Identifiquei as seguintes figurinhas:\n*${codesStr}*\n\nEstão corretas?\n\n1 - Sim, pode salvar\n2 - Não, vou enviar outra foto`);
                return;
            }

            // -- STATE: AWAITING_STICKER_CONFIRMATION --
            if (session.state === States.AWAITING_STICKER_CONFIRMATION) {
                if (textMessage === '1' || textMessage.toLowerCase() === 'sim') {
                    await reply("Atualizando seu álbum no banco de dados...");

                    // Update DB
                    const { user, selectedAlbum, actionType, identifiedCodes } = session.data;
                    const isAdding = actionType === 'ADD';
                    const result = await processStickers(user.id, selectedAlbum.id, selectedAlbum.album_template_id, identifiedCodes, isAdding);

                    if (result.success) {
                        let finalMessage = `✅ Tudo pronto! O álbum foi atualizado com sucesso.`;
                        
                        if (isAdding) {
                            if (result.addedNew && result.addedNew.length > 0) {
                                finalMessage += `\n✨ *Novas* (${result.addedNew.length}): ${result.addedNew.join(', ')}`;
                            }
                            if (result.addedRepeated && result.addedRepeated.length > 0) {
                                finalMessage += `\n🔁 *Repetidas* (${result.addedRepeated.length}): ${result.addedRepeated.join(', ')}`;
                            }
                        }

                        if (result.notFound && result.notFound.length > 0) {
                            finalMessage += `\n\n⚠️ Atenção: Alguns códigos não foram encontrados neste álbum: ${result.notFound.join(', ')}`;
                        }
                        if (result.notOwned && result.notOwned.length > 0) {
                            finalMessage += `\n\nℹ️ Nota: Algumas figurinhas não foram removidas pois você não tinha nenhuma delas: ${result.notOwned.join(', ')}`;
                        }
                        finalMessage += `\n\nMande outra foto ou digite os códigos para continuar ${isAdding ? 'adicionando' : 'removendo'}. (Ou digite 'voltar' para trocar a ação, ou 'sair' para encerrar)`;

                        // Go back to AWAITING_PHOTO to allow more uploads in the same session
                        sessionManager.updateState(phone, States.AWAITING_PHOTO);
                        await reply(finalMessage);
                    } else {
                        sessionManager.updateState(phone, States.AWAITING_PHOTO);
                        await reply(`❌ Ocorreu um erro ao processar: Nenhuma das figurinhas identificadas pertence a este álbum.\nCódigos: ${result.notFound.join(', ')}\n\nEnvie outra foto ou digite os códigos se quiser continuar.`);
                    }
                } else if (textMessage === '2' || textMessage.toLowerCase() === 'nao' || textMessage.toLowerCase() === 'não' || textMessage.toLowerCase() === 'cancelar' || textMessage.toLowerCase() === 'voltar') {
                    sessionManager.updateState(phone, States.AWAITING_PHOTO);
                    await reply("Tudo bem! A leitura foi descartada.\n\nPode me enviar outra foto ou digitar os códigos, digite 'voltar' para trocar a ação, ou 'sair' para encerrar.");
                } else if (textMessage.toLowerCase() === 'sair') {
                    sessionManager.clearSession(phone);
                    await reply("Sessão encerrada. Me mande um 'Oi' quando quiser recomeçar.");
                } else {
                    await reply("Opção inválida. Responda 1 para confirmar as figurinhas, 2 para enviar outra foto, ou 'sair'.");
                }
                return;
            }

        } catch (error) {
            console.error(`Error processing message for ${phone}:`, error);
            await reply(`Desculpe, ocorreu um erro interno ao processar sua solicitação. Tente novamente mais tarde.\n\nDetalhe do erro: ${error.message}`);
            sessionManager.clearSession(phone);
        }
    });
}

// Start bot
connectToWhatsApp();
