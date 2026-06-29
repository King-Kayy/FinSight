import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index';
import { ValidationError, AuthError, ConflictError } from '../middleware/errors';
import type { UserProfile, AuthResponse } from '../../shared/api';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

/**
 * Register a new user and return a signed JWT (same shape as login).
 * Throws ValidationError for missing/invalid fields, ConflictError on duplicate email.
 */
export async function register(
  email: string,
  name: string,
  password: string,
): Promise<AuthResponse> {
  // Validate required fields
  if (!email) {
    throw new ValidationError('Email is required', 'email');
  }
  if (!name) {
    throw new ValidationError('Name is required', 'name');
  }
  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters', 'password');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const result = await db.query(
      'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, name, passwordHash],
    );
    const row = result.rows[0];
    console.log('[auth] Registered user:', row.id, row.email, '| hash prefix:', passwordHash.slice(0, 7));

    // Issue a JWT immediately — no need for a second login round-trip
    const token = jwt.sign(
      { id: row.id, email: row.email },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    const userProfile: UserProfile = { id: row.id, email: row.email, name: row.name };
    return { token, user: userProfile };
  } catch (err: any) {
    // PostgreSQL unique violation code
    if (err?.code === '23505' || (err?.message as string | undefined)?.includes('unique')) {
      throw new ConflictError('Email already registered');
    }
    // In-memory fallback may use a different error shape — check message text
    if ((err?.message as string | undefined)?.toLowerCase().includes('duplicate')) {
      throw new ConflictError('Email already registered');
    }
    throw err;
  }
}

/**
 * Reset a user's password directly (no email required).
 * Throws ValidationError for missing/invalid fields, AuthError if email not found.
 */
export async function resetPassword(
  email: string,
  newPassword: string,
): Promise<void> {
  if (!email) throw new ValidationError('Email is required', 'email');
  if (!newPassword || newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters', 'password');
  }

  const result = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );
  if (result.rows.length === 0) {
    throw new AuthError('No account found with that email');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.query(
    'UPDATE users SET password = $1 WHERE email = $2',
    [passwordHash, email],
  );
}

/**
 * Authenticate a user and return a signed JWT.
 * Throws AuthError on unknown email or wrong password.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await db.query(
    'SELECT id, email, name, password FROM users WHERE email = $1',
    [email],
  );

  if (result.rows.length === 0) {
    throw new AuthError('Invalid credentials');
  }

  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    // Log server-side to help diagnose hash mismatches during development
    console.error('[auth] bcrypt.compare failed for', email,
      '| hash length:', user.password?.length,
      '| hash prefix:', user.password?.slice(0, 7));
    throw new AuthError('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' },
  );

  const userProfile: UserProfile = { id: user.id, email: user.email, name: user.name };

  return { token, user: userProfile };
}
