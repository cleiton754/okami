import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';

export async function getUsers(req, res) {
  try {
    const [rows] = await db.query('SELECT id, nome, email, cargo, ativo, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao buscar usuários:', err);
    res.status(500).json({ message: 'Erro ao buscar usuários no banco de dados.' });
  }
}

export async function createUser(req, res) {
  try {
    const { nome, email, senha, cargo } = req.body;
    if (!nome || !email || !senha || !cargo) return res.status(400).json({ message: 'Campos obrigatórios faltando.' });

    const senhaHash = await bcrypt.hash(senha, 10);
    const [resDb] = await db.query('INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo) VALUES (?, ?, ?, ?, 1)', [nome, email, senhaHash, cargo]);
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', id: resDb.insertId });
  } catch (err) {
    console.error('❌ Erro ao cadastrar usuário:', err);
    res.status(500).json({ message: 'Erro ao cadastrar usuário no banco de dados.' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { nome, email, cargo, ativo, senha } = req.body;

    let sql = 'UPDATE usuarios SET nome=?, email=?, cargo=?, ativo=?';
    const params = [nome, email, cargo, ativo ? 1 : 0];

    if (senha) {
      sql += ', senha_hash=?';
      params.push(await bcrypt.hash(senha, 10));
    }
    sql += ' WHERE id=?';
    params.push(id);

    await db.query(sql, params);
    res.json({ message: 'Usuário atualizado!' });
  } catch (err) {
    console.error('❌ Erro ao atualizar usuário:', err);
    res.status(500).json({ message: 'Erro ao atualizar usuário no banco de dados.' });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT ativo FROM usuarios WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const newAtivo = rows[0].ativo ? 0 : 1;
    await db.query('UPDATE usuarios SET ativo = ? WHERE id = ?', [newAtivo, id]);
    res.json({ message: `Status alterado com sucesso!`, ativo: newAtivo });
  } catch (err) {
    console.error('❌ Erro ao alterar status do usuário:', err);
    res.status(500).json({ message: 'Erro ao alterar status do usuário no banco de dados.' });
  }
}

