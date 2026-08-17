import { db } from '../config/database.js';

export async function getHistory(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT h.*, u.nome AS usuario_nome, p.numero_pedido
      FROM historico h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN pedidos p ON h.pedido_id = p.id
      ORDER BY h.data_hora DESC LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao buscar histórico:', err);
    res.status(500).json({ message: 'Erro ao carregar histórico no banco de dados.' });
  }
}

