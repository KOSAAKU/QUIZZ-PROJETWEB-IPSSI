import { sequelize } from '../config/database.js';

export async function createQuizz(name, questions, ownerId) {
    const result = await sequelize.query(
        'INSERT INTO quizzs (name, questions, ownerId) VALUES (:name, :questions, :ownerId) RETURNING id',
        { replacements: { name, questions, ownerId } }
    );
    return { id: result[0].id, name, questions, ownerId };
}

export async function getQuizzById(quizzId) {
    const result = await sequelize.query(
        'SELECT * FROM quizzs WHERE id = :quizzId',
        { replacements: { quizzId } }
    );
    return result.length > 0 ? result[0] : null; 
}

export async function getQuizzsByOwner(ownerId) {
    const result = await sequelize.query(
        'SELECT * FROM quizzs WHERE ownerId = :ownerId',
        { replacements: { ownerId } }
    );
    return result;
}

export async function deleteQuizz(quizzId) {
    await sequelize.query(
        'DELETE FROM quizzs WHERE id = :quizzId',
        { replacements: { quizzId } }
    );
    
    await sequelize.query(
        'DELETE FROM reponses WHERE quizzId = :quizzId',
        { replacements: { quizzId } }
    );
}

export async function updateQuizz(quizzId, name, questions) {
    try {
        // check if the quizz status is 'pending'
        const statusResult = await getQuizzStatus(quizzId);

        if (!statusResult) {
            throw new Error('Quizz not found');
        }
        
        if (statusResult !== 'pending') {
            throw new Error('Only pending quizzs can be updated');
        }

        await sequelize.query(
        'UPDATE quizzs SET name = :name, questions = :questions WHERE id = :quizzId',
        { replacements: { quizzId, name, questions } }
        );
    } catch (error) {
        console.error('Update quizz error:', error);
        throw error;
    }
}

export async function getQuizzStatus(quizzId) {
    const result = await sequelize.query(
        'SELECT status FROM quizzs WHERE id = :quizzId',
        { replacements: { quizzId } }
    );
    return result.length > 0 ? result[0].status : null; 
}