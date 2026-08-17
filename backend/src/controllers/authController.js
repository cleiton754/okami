import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'okami_universo_secret_key_vanilla_2026';

export async function login(req, res) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });

    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Credenciais inválidas ou usuário inativo.' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(senha, user.senha_hash);
    if (!isMatch) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      usuario: { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo }
    });
  } catch (err) {
    console.error('❌ Erro no login:', err);
    res.status(500).json({ message: 'Erro ao fazer login no banco de dados.' });
  }
}

export async function me(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT id, nome, email, cargo, ativo, criado_em FROM usuarios WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });

    res.json({ usuario: rows[0] });
  } catch (err) {
    console.error('❌ Erro ao verificar perfil me:', err);
    res.status(500).json({ message: 'Erro ao verificar perfil no banco de dados.' });
  }
}

