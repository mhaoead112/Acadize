
import pool from '../db/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required!');
}
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export async function registerUser(data: { name?:string; email:string; password:string; role?:string }) {
  const { name, email, password, role } = data;
  if (!email || !password) throw new Error('email and password required');
  const hashed = await bcrypt.hash(password, 10);
  const q = 'INSERT INTO users(name,email,password,role,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW()) RETURNING id,name,email,role';
  try {
    const r = await pool.query(q, [name||null, email, hashed, role||'student']);
    return r.rows[0];
  } catch (e:any) {
    if (e.code === '23505') throw new Error('Email already exists');
    throw e;
  }
}

export async function loginUser(data: { email:string; password:string }) {
  const { email, password } = data;
  if (!email || !password) throw new Error('email and password required');
  const q = 'SELECT id,email,password,role,name FROM users WHERE email=$1';
  const r = await pool.query(q, [email]);
  if (r.rowCount === 0) throw new Error('invalid credentials');
  const user = r.rows[0];
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('invalid credentials');
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  return token;
}

export async function googleUpsert(id_token: string) {
  if (!GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID not set');
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken: id_token, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new Error('Invalid Google token');
  const email = payload.email;
  const name = payload.name || null;
  // check existing
  const sel = 'SELECT id,email,role,name FROM users WHERE email=$1';
  const r = await pool.query(sel, [email]);
  if (r.rowCount > 0) {
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    return token;
  }
  const ins = 'INSERT INTO users(name,email,password,role,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW()) RETURNING id,name,email,role';
  const rr = await pool.query(ins, [name, email, '', 'student']);
  const user = rr.rows[0];
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  return token;
}
