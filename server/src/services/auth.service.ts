import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// These should be in your .env file
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required!');
}
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10; // Standard for bcrypt password hashing

// --- Interfaces for Data Transfer ---
// Defines the shape of data for registering a new user
export interface RegisterUserDto {
    email: string;
    password: string;
    name: string;
    username?: string;
    // Role is optional, defaults to 'student' if not provided
    role?: 'student' | 'teacher' | 'admin';
}

// Defines the shape of data for logging in
export interface LoginUserDto {
    email: string;
    password: string;
}

// Defines the shape of the data we send back on successful login
export interface AuthResponse {
    token: string;
    refreshToken: string;
    expiresIn: number;
    user: {
        id: string;
        fullName: string;
        username: string;
        email: string;
        role: string;
        profilePicture?: string | null;
        grade?: string | null;
        passwordResetExpires?: Date | null;
        emailVerified?: boolean | null;
        isTemporaryPassword?: boolean;
    };
}

/**
 * Registers a new user in the database.
 * Handles password hashing and checks for existing users.
 * @param userData The user data for registration.
 * @returns The newly created user's public information.
 */
export const registerUser = async (userData: RegisterUserDto) => {
    const { email, password, name, username, role = 'student' } = userData;

    // Generate username from email if not provided
    const finalUsername = username || email.split('@')[0] + '_' + Date.now().toString(36);

    // 1. Check if a user with that email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existingUser.length > 0) {
        // Use a generic error to prevent email enumeration
        throw new Error("A user with this email already exists.");
    }

    // Check if username already exists
    const existingUsername = await db.select().from(users).where(eq(users.username, finalUsername));
    if (existingUsername.length > 0) {
        throw new Error("This username is already taken.");
    }

    // 2. Hash the password securely
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Insert the new user into the database
    const newUser = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName: name, // Use 'name' as fullName
        username: finalUsername,
        role,
    }).returning({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        isTemporaryPassword: users.isTemporaryPassword,
    });

    if (!newUser[0]) {
        throw new Error("Failed to create the user account.");
    }

    // 4. Send welcome email (non-blocking)
    try {
        const { EmailService } = await import('./email.service.js');
        await EmailService.sendWelcomeEmail({
            email: newUser[0].email,
            fullName: newUser[0].fullName,
            role: newUser[0].role,
        });
        console.log(`✅ Welcome email sent to ${newUser[0].email}`);
    } catch (emailError) {
        // Log error but don't fail registration
        console.error('❌ Failed to send welcome email:', emailError);
    }

    return newUser[0];
};

/**
 * Authenticates a user and provides JWT access and refresh tokens.
 * @param credentials The user's login email and password.
 * @returns An object containing the JWT tokens and public user information.
 */
export const loginUser = async (credentials: LoginUserDto): Promise<AuthResponse> => {
    const { email, password } = credentials;

    // 1. Find the user by their email
    const potentialUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (potentialUser.length === 0) {
        // Use a generic error to prevent timing attacks and email enumeration
        throw new Error("Invalid credentials.");
    }
    const user = potentialUser[0];

    // 2. Compare the provided password with the stored hash
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        throw new Error("Invalid Password");
    }

    // 3. Generate access and refresh tokens using TokenService
    const { TokenService } = await import('./token.service.js');
    const tokenPair = await TokenService.generateTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
    });

    // 4. Return the tokens and public user data
    console.log('Login successful for user:', user.email);

    return {
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: {
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            grade: user.grade,
            passwordResetExpires: user.passwordResetExpires,
            emailVerified: user.emailVerified,
            isTemporaryPassword: user.isTemporaryPassword,
        }
    };
};