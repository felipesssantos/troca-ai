import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function identifyStickersFromImage(imageBuffer, mimeType) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `Você é um assistente especializado em álbuns de figurinhas da Copa do Mundo e afins.
Identifique todos os códigos das figurinhas presentes nesta imagem.
Normalmente os códigos têm letras e números (ex: BRA 1, MEX 10, FWC 2, 00, etc).
Retorne APENAS os códigos identificados separados por vírgula.
Não adicione nenhum texto extra, introdução ou conclusão.
Apenas a lista de códigos.
Se não encontrar nenhuma figurinha, retorne vazio.`;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();

        if (!text || text.trim() === '') return [];

        // Parse and clean the returned string (e.g. "BRA 1, MEX 10" -> ['BRA 1', 'MEX 10'])
        const codes = text.split(',')
            .map(code => code.trim().toUpperCase())
            .filter(code => code.length > 0);

        return codes;
    } catch (error) {
        console.error("Error processing image with Gemini:", error);
        throw error;
    }
}
