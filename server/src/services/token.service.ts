// server/src/services/token.service.ts

import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { refreshTokens } from '../db/schema.js';
import { eq, and, gt, lt } from 'drizzle-orm';
import crypto from 'crypto';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
}

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = '4h'; // 4 hours
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface TokenPayload {
    id: string;
    email: string;
    role: string;
    fullName: string;
    organizationId: string; // Multi-tenant organization ID
    preferredLocale?: string | null; // i18n: user's preferred language
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
     * Rotate a refresh token: securely invalidates the old one and generates a new pair.
     * Returns the user ID if successful, or null if invalid.
     * If a revoked token is used, it revokes ALL tokens for that user (security feature).
     */
    static async rotateRefreshToken(oldToken: string): Promise<string | null> {
        try {
            // First find the token record
            const [tokenRecord] = await db
                .select()
                .from(refreshTokens)
                .where(eq(refreshTokens.token, oldToken))
                .limit(1);

            if (!tokenRecord) {
                return null; // Token doesn't exist
            }

            if (tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
                // REUSE DETECTED or EXPIRED
                // Security policy: If a revoked token is used, assume breach and revoke ALL tokens for this user.
                logger.warn('[TokenService] Revoked/Expired refresh token reused. Revoking all user tokens.', { userId: tokenRecord.userId });
                await this.revokeAllUserTokens(tokenRecord.userId);
                return null;
            }

            // Attempt to revoke the token specifically
            const result = await db
                .update(refreshTokens)
                .set({ revoked: true })
                .where(
                    and(
                        eq(refreshTokens.token, oldToken),
                        eq(refreshTokens.revoked, false)
                    )
                )
                .returning({ updatedToken: refreshTokens.token });

            // If no rows were updated, a concurrent request beat us to it.
            if (result.length === 0) {
                 logger.warn('[TokenService] Concurrent refresh detected.', { userId: tokenRecord.userId });
                 return null;
            }

            return tokenRecord.userId;
        } catch (error) {
            logger.error('[TokenService] Error rotating refresh token:', { error: String(error) });
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
                        lt(refreshTokens.expiresAt, new Date()),
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
