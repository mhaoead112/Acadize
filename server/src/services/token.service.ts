// server/src/services/token.service.ts

import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { refreshTokens } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '4h'; // 4 hours
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface TokenPayload {
    id: string;
    email: string;
    role: string;
    fullName: string;
    organizationId: string; // Multi-tenant organization ID
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export class TokenService {
    /**
     * Generate access token (short-lived)
     */
    static generateAccessToken(payload: TokenPayload): string {
        return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRY,
        });
    }

    /**
     * Generate refresh token (long-lived)
     */
    static generateRefreshToken(): string {
        return crypto.randomBytes(64).toString('hex');
    }

    /**
     * Generate both access and refresh tokens
     */
    static async generateTokenPair(user: TokenPayload): Promise<TokenPair> {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken();

        // Store refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: user.id,
            expiresAt,
            createdAt: new Date(),
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: 4 * 60 * 60, // 4 hours in seconds
        };
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
            return decoded;
        } catch (error) {
            return null;
        }
    }

    /**
     * Verify refresh token and return user ID
     */
    static async verifyRefreshToken(token: string): Promise<string | null> {
        try {
            const [tokenRecord] = await db
                .select()
                .from(refreshTokens)
                .where(
                    and(
                        eq(refreshTokens.token, token),
                        eq(refreshTokens.revoked, false),
                        gt(refreshTokens.expiresAt, new Date())
                    )
                )
                .limit(1);

            if (!tokenRecord) {
                return null;
            }

            return tokenRecord.userId;
        } catch (error) {
            console.error('[TokenService] Error verifying refresh token:', error);
            return null;
        }
    }

    /**
     * Revoke a refresh token
     */
    static async revokeRefreshToken(token: string): Promise<boolean> {
        try {
            await db
                .update(refreshTokens)
                .set({ revoked: true })
                .where(eq(refreshTokens.token, token));

            return true;
        } catch (error) {
            console.error('[TokenService] Error revoking refresh token:', error);
            return false;
        }
    }

    /**
     * Revoke all refresh tokens for a user
     */
    static async revokeAllUserTokens(userId: string): Promise<boolean> {
        try {
            await db
                .update(refreshTokens)
                .set({ revoked: true })
                .where(eq(refreshTokens.userId, userId));

            return true;
        } catch (error) {
            console.error('[TokenService] Error revoking user tokens:', error);
            return false;
        }
    }

    /**
     * Clean up expired tokens (run periodically)
     */
    static async cleanupExpiredTokens(): Promise<number> {
        try {
            const result = await db
                .delete(refreshTokens)
                .where(
                    and(
                        gt(new Date(), refreshTokens.expiresAt),
                        eq(refreshTokens.revoked, true)
                    )
                );

            console.log(`[TokenService] Cleaned up expired tokens`);
            return 0; // Drizzle doesn't return count easily
        } catch (error) {
            console.error('[TokenService] Error cleaning up tokens:', error);
            return 0;
        }
    }
}
