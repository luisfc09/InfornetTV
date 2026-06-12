// Regras de autenticação do Admin Panel (login, troca de senha, criação de
// admins). Usa supabaseAdmin (service_role) — só roda no servidor.

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../database/supabase.js';

export class AdminAuthService {
  private secret(): string {
    const s = process.env.ADMIN_JWT_SECRET;
    if (!s) throw new Error('ADMIN_JWT_SECRET não configurado.');
    return s;
  }

  async login(email: string, password: string) {
    // Busca admin
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      throw new Error('Admin não encontrado');
    }

    // Verifica senha
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      throw new Error('Senha incorreta');
    }

    // Gera token ADMIN (diferente do token de usuário normal)
    const token = jwt.sign(
      {
        admin_id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      this.secret(),
      { expiresIn: process.env.ADMIN_JWT_EXPIRY || '30d' } as jwt.SignOptions,
    );

    // Atualiza last_login
    await supabaseAdmin
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Auditoria do login
    await supabaseAdmin.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'login',
      resource_type: 'admin',
      resource_id: admin.id,
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        permissions: admin.permissions,
      },
    };
  }

  async changePassword(adminId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error } = await supabaseAdmin
      .from('admin_users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminId);

    if (error) throw error;
    return { success: true };
  }

  async createAdmin(
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'operator',
    permissions: string[],
    createdBy: string,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .insert({
        email,
        password_hash: hashedPassword,
        full_name: fullName,
        role,
        permissions,
        created_by: createdBy,
        is_active: true,
      })
      .select('id, email, full_name, role, permissions, is_active, created_at')
      .single();

    if (error) throw error;
    return data;
  }
}
