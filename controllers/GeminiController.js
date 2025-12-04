import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate quiz questions using Gemini AI
 * @param {string} theme - The theme/category for the quiz
 * @param {number} numQuestions - Number of questions to generate
 * @param {string} userRole - The role of the user ('ecole' or 'entreprise')
 * @returns {Promise<Array>} Array of generated questions
 */
export async function generateQuizWithGemini(theme, numQuestions, userRole) {
    try {
        // Utiliser gemini-1.5-flash sans préfixe ni suffixe
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Déterminer les types de questions autorisés selon le rôle
        const allowedTypes = userRole === 'ecole'
            ? 'uniquement des questions QCM (choix multiples)'
            : 'des questions QCM (choix multiples) et des questions à réponse libre';

        const prompt = `Génère ${numQuestions} questions de quiz sur le thème "${theme}".

IMPORTANT: Tu dois générer ${allowedTypes}.

Pour chaque question, respecte STRICTEMENT ce format JSON:

Pour les questions QCM:
{
    "question": "Texte de la question",
    "type": "qcm",
    "choices": ["Choix 1", "Choix 2", "Choix 3", "Choix 4"],
    "answer": "La bonne réponse exacte parmi les choix"
}

Pour les questions libres (UNIQUEMENT si le rôle est entreprise):
{
    "question": "Texte de la question",
    "type": "libre"
}

Règles:
- Pour les questions QCM, fournis exactement 4 choix de réponse
- Le champ "answer" doit contenir la valeur exacte de la bonne réponse (pas l'index)
- ${userRole === 'ecole' ? 'Ne génère QUE des questions de type QCM' : 'Génère un mélange de questions QCM et libres'}
- Retourne uniquement un tableau JSON valide, sans texte avant ou après
- Ne pas inclure de numérotation dans les questions

Exemple de réponse attendue:
[
    {
        "question": "Quelle est la capitale de la France?",
        "type": "qcm",
        "choices": ["Paris", "Lyon", "Marseille", "Bordeaux"],
        "answer": "Paris"
    },
    {
        "question": "Explique le concept de photosynthèse",
        "type": "libre"
    }
]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Nettoyer la réponse pour extraire uniquement le JSON
        let jsonText = text.trim();

        // Enlever les balises markdown si présentes
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Parser le JSON
        const questions = JSON.parse(jsonText);

        // Valider et formater les questions
        const formattedQuestions = questions.map(q => {
            if (q.type === 'qcm') {
                if (!q.question || !q.choices || !Array.isArray(q.choices) || !q.answer) {
                    throw new Error('Format de question QCM invalide');
                }
                return {
                    question: q.question,
                    type: 'qcm',
                    choices: q.choices,
                    answer: q.answer
                };
            } else if (q.type === 'libre') {
                if (userRole === 'ecole') {
                    throw new Error('Les questions libres ne sont pas autorisées pour le rôle école');
                }
                if (!q.question) {
                    throw new Error('Format de question libre invalide');
                }
                return {
                    question: q.question,
                    type: 'libre'
                };
            } else {
                throw new Error(`Type de question inconnu: ${q.type}`);
            }
        });

        return formattedQuestions;
    } catch (error) {
        console.error('Erreur lors de la génération avec Gemini:', error);
        throw new Error(`Échec de la génération du quiz avec l'IA: ${error.message}`);
    }
}
