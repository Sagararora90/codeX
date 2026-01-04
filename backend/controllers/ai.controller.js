import * as aiService from '../services/ai.service.js';

export const getResult = async (req, res) => {
    try {
        const { prompt } = req.query;
        const result = await aiService.generateResult(prompt);
        res.status(200).send(result);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}
