import express from 'express';
import { registerUser, loginUser } from '../services/auth.service.js';

const router = express.Router();

// --- ROUTE: POST /api/auth/register ---
// Handles new user registration.
router.post('/register', async (req, res) => {
    const { email, password, name, role, username } = req.body;

    // 1. Basic Input Validation
    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    try {
        // 2. Call the service to handle the complex logic
        const newUser = await registerUser({ email, password, name, role, username });
        // 3. Send a success response
        res.status(201).json({
            message: 'User registered successfully!',
            user: newUser,
        });
    } catch (error) {
        // 4. Handle errors from the service (e.g., user already exists)
        console.error('Registration Error:', error instanceof Error ? error.message : error);
        res.status(409).json({ message: error instanceof Error ? error.message : 'Registration failed' }); // 409 Conflict is a good status for "already exists"
    }
});

// --- ROUTE: POST /api/auth/login ---
// Handles user login.
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // 1. Basic Input Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 2. Call the service to handle the login logic
        const authResponse = await loginUser({ email, password });
        // 3. Send a success response with the token and user info
        res.status(200).json(authResponse);
    } catch (error) {
        // 4. Handle errors (e.g., invalid credentials)
        console.error('Login Error:', error instanceof Error ? error.message : error);
        res.status(401).json({ message: error instanceof Error ? error.message : 'Login failed' }); // 401 Unauthorized is the correct status here
    }
});

// --- ROUTE: POST /api/auth/refresh ---
// Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required.' });
    }

    try {
        const { TokenService } = await import('../services/token.service.js');
        const { users } = await import('../db/schema.js');
        const { db } = await import('../db/index.js');
        const { eq } = await import('drizzle-orm');

        // Verify refresh token
        const userId = await TokenService.verifyRefreshToken(refreshToken);

        if (!userId) {
            return res.status(401).json({ message: 'Invalid or expired refresh token.' });
        }

        // Get user data
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                role: users.role,
                fullName: users.fullName,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        // Generate new access token
        const accessToken = TokenService.generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        });

        res.status(200).json({
            token: accessToken,
            user,
            expiresIn: 4 * 60 * 60, // 4 hours
        });
    } catch (error) {
        console.error('Refresh Token Error:', error instanceof Error ? error.message : error);
        res.status(401).json({ message: 'Failed to refresh token.' });
    }
});

// --- ROUTE: POST /api/auth/logout ---
// Logout user and revoke refresh token
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(200).json({ message: 'Logged out successfully.' });
    }

    try {
        const { TokenService } = await import('../services/token.service.js');
        await TokenService.revokeRefreshToken(refreshToken);

        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error('Logout Error:', error instanceof Error ? error.message : error);
        res.status(200).json({ message: 'Logged out successfully.' });
    }
});

export default router;