// Regras de autenticação: cadastro (hash de senha) e login (verificação + JWT).

import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository.js';
import { generateToken } from '../utils/jwt.js';
import { DB_ENABLED } from '../database/db.js';
import { User } from '../types/index.js';

const SALT_ROUNDS = 10;

/** Versão segura do usuário para enviar ao cliente (sem o hash da senha). */
export type PublicUser = Omit<User, 'password_hash'>;

export interface AuthResult {
  token: string;
  user: PublicUser;
}

function toPublic(user: User): PublicUser {
  const { password_hash, ...rest } = user;
  return rest;
}

export class AuthService {
  private users = new UserRepository();

  private assertDb() {
    if (!DB_ENABLED) {
      throw new Error('DATABASE_URL não configurado — autenticação indisponível.');
    }
  }

  async register(email: string, password: string, cpf?: string): Promise<AuthResult> {
    this.assertDb();

    const existing = await this.users.findByEmail(email);
    if (existing) {
      const err = new Error('E-mail já cadastrado.');
      (err as any).status = 409;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.users.create({ email, password_hash, cpf });

    return this.buildResult(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    this.assertDb();

    const user = await this.users.findByEmail(email);
    if (!user) {
      const err = new Error('Credenciais inválidas.');
      (err as any).status = 401;
      throw err;
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      const err = new Error('Credenciais inválidas.');
      (err as any).status = 401;
      throw err;
    }

    return this.buildResult(user);
  }

  private buildResult(user: User): AuthResult {
    const token = generateToken({
      user_id: user.id,
      email: user.email,
      tier: user.tier,
    });
    return { token, user: toPublic(user) };
  }
}
