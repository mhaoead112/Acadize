import express from 'express';
import { getRagResponse } from '../services/ai.service.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

const router = express.Router();

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];

// This route will be accessible at POST /api/ai/ask
// A user must be logged in to use the AI Buddy.
router.post('/ask', ...requireAuth, async (req, res) => {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: 'A "question" string is required in the request body.' });
    }

    try {
        const aiResponse = await getRagResponse(question);
        res.json({ answer: aiResponse });
    } catch (error) {
        console.error("Error getting AI response:", error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
});

export default router;