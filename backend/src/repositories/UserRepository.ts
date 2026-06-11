// Persistência de usuários no Postgres. Mapeia a tabela `users` <-> User.

import { query } from '../database/db.js';
import { User } from '../types/index.js';

interface UserRow {
  id: string;
  email: string;
  cpf: string | null;
  password_hash: string;
  tier: string | null;
  subscription_active: boolean | null;
  subscription_end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    cpf: r.cpf ?? undefined,
    password_hash: r.password_hash,
    tier: (r.tier as User['tier']) ?? 'free',
    subscription_active: r.subscription_active ?? true,
    subscription_end_date: r.subscription_end_date ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export interface NewUser {
  email: string;
  password_hash: string;
  cpf?: string | null;
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async create(u: NewUser): Promise<User> {
    const rows = await query<UserRow>(
      `INSERT INTO users (email, cpf, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [u.email.toLowerCase(), u.cpf ?? null, u.password_hash],
    );
    return rowToUser(rows[0]);
  }
}
