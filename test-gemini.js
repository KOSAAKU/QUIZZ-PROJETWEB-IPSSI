import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        console.log('Testing different model names...\n');

        const modelNames = [
            'gemini-pro',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'models/gemini-pro',
            'models/gemini-1.5-flash'
        ];

        for (const modelName of modelNames) {
            try {
                console.log(`Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say hello');
                const response = await result.response;
                const text = response.text();
                console.log(`✓ SUCCESS with ${modelName}`);
                console.log(`Response: ${text.substring(0, 50)}...\n`);
                break; // Si succès, on arrête
            } catch (error) {
                console.log(`✗ FAILED with ${modelName}`);
                console.log(`Error: ${error.message}\n`);
            }
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testGemini();
