import { db } from '../config/database.js';

async function recordHistory(pedidoId, usuarioId, acao) {
  await db.query('INSERT INTO historico (pedido_id, usuario_id, acao, data_hora) VALUES (?, ?, ?, NOW())', [pedidoId, usuarioId, acao]);
}

export async function getOrders(req, res) {
  try {
    const { loja, produto, status, data, busca, arquivados } = req.query;

    let sql = `
      SELECT p.*, u.nome AS criador_nome,
             JSON_ARRAYAGG(
               IF(a.id IS NULL, NULL, JSON_OBJECT('id', a.id, 'nome', a.nome, 'url', a.url, 'tipo', a.tipo, 'formato', a.formato))
             ) AS arquivos_json
      FROM pedidos p
      LEFT JOIN usuarios u ON p.criado_por = u.id
      LEFT JOIN arquivos a ON p.id = a.pedido_id
      WHERE 1=1
    `;
    const params = [];

    if (arquivados === 'true') sql += ` AND p.status = 'Arquivado'`;
    else sql += ` AND p.status != 'Arquivado'`;

    if (loja) { sql += ` AND p.loja = ?`; params.push(loja); }
    if (produto) { sql += ` AND p.produto = ?`; params.push(produto); }
    if (status) { sql += ` AND p.status = ?`; params.push(status); }
    if (data) { sql += ` AND p.data_pedido = ?`; params.push(data); }
    if (busca) { sql += ` AND (p.titulo LIKE ? OR p.numero_pedido LIKE ?)`; params.push(`%${busca}%`, `%${busca}%`); }

    sql += ` GROUP BY p.id, u.nome ORDER BY p.data_pedido ASC, p.criado_em DESC`;
    const [rows] = await db.query(sql, params);
    const parsed = rows.map(r => ({
      ...r,
      arquivos: Array.isArray(r.arquivos_json) ? r.arquivos_json.filter(x => x !== null) : (typeof r.arquivos_json === 'string' ? JSON.parse(r.arquivos_json).filter(x => x !== null) : [])
    }));
    res.json(parsed);
  } catch (err) {
    console.error('❌ Erro ao buscar pedidos:', err);
    res.status(500).json({ message: 'Erro ao buscar pedidos no banco de dados.' });
  }
}

export async function createOrder(req, res) {
  try {
    const { numero_pedido, titulo, loja, produto, quantidade, data_pedido, tipo_espiral, frente_verso, observacoes } = req.body;
    const criadoPor = req.user.id;
    const usuarioNome = req.user.nome;
    const numQtd = Number(quantidade);
    const numFrenteVerso = frente_verso === 'true' || frente_verso === true || frente_verso === 1 ? 1 : 0;

    const [resDb] = await db.query(
      `INSERT INTO pedidos (numero_pedido, titulo, loja, produto, quantidade, data_pedido, tipo_espiral, frente_verso, observacoes, status, criado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando Impressão', ?)`,
      [numero_pedido, titulo, loja, produto, numQtd, data_pedido, tipo_espiral, numFrenteVerso, observacoes || '', criadoPor]
    );
    const newId = resDb.insertId;

    if (req.files) {
      if (req.files.arte_frente) {
        const file = req.files.arte_frente[0];
        const fileUrl = `/uploads/${file.filename || file.originalname}`;
        await db.query('INSERT INTO arquivos (pedido_id, nome, url, tipo, formato) VALUES (?, ?, ?, ?, ?)', [newId, file.originalname, fileUrl, 'frente', file.mimetype]);
      }
      if (req.files.arte_verso) {
        const file = req.files.arte_verso[0];
        const fileUrl = `/uploads/${file.filename || file.originalname}`;
        await db.query('INSERT INTO arquivos (pedido_id, nome, url, tipo, formato) VALUES (?, ?, ?, ?, ?)', [newId, file.originalname, fileUrl, 'verso', file.mimetype]);
      }
      if (req.files.arquivos_extras) {
        for (const file of req.files.arquivos_extras) {
          const fileUrl = `/uploads/${file.filename || file.originalname}`;
          await db.query('INSERT INTO arquivos (pedido_id, nome, url, tipo, formato) VALUES (?, ?, ?, ?, ?)', [newId, file.originalname, fileUrl, 'extra', file.mimetype]);
        }
      }
    }

    await recordHistory(newId, criadoPor, `${usuarioNome} criou o pedido #${numero_pedido} - "${titulo}".`);
    res.status(201).json({ message: 'Pedido criado com sucesso!', id: newId });
  } catch (err) {
    console.error('❌ Erro ao criar pedido:', err);
    res.status(500).json({ message: 'Erro ao criar pedido no banco de dados.' });
  }
}

export async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const { titulo, loja, produto, quantidade, data_pedido, tipo_espiral, frente_verso, observacoes } = req.body;
    const usuarioNome = req.user.nome;
    const numQtd = Number(quantidade);
    const numFrenteVerso = frente_verso === 'true' || frente_verso === true || frente_verso === 1 ? 1 : 0;

    const [rows] = await db.query('SELECT numero_pedido FROM pedidos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Pedido não encontrado.' });

    await db.query(
      `UPDATE pedidos SET titulo=?, loja=?, produto=?, quantidade=?, data_pedido=?, tipo_espiral=?, frente_verso=?, observacoes=?, atualizado_em=NOW() WHERE id=?`,
      [titulo, loja, produto, numQtd, data_pedido, tipo_espiral, numFrenteVerso, observacoes || '', id]
    );

    await recordHistory(id, req.user.id, `${usuarioNome} editou o pedido #${rows[0].numero_pedido}.`);
    res.json({ message: 'Pedido atualizado!' });
  } catch (err) {
    console.error('❌ Erro ao atualizar pedido:', err);
    res.status(500).json({ message: 'Erro ao atualizar pedido no banco de dados.' });
  }
}

export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const usuarioNome = req.user.nome;

    const [rows] = await db.query('SELECT numero_pedido, status FROM pedidos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Pedido não encontrado.' });

    const oldStatus = rows[0].status;
    await db.query('UPDATE pedidos SET status = ?, atualizado_em = NOW() WHERE id = ?', [status, id]);
    await recordHistory(id, req.user.id, `${usuarioNome} alterou status do pedido #${rows[0].numero_pedido} de "${oldStatus}" para "${status}".`);
    res.json({ message: 'Status atualizado!' });
  } catch (err) {
    console.error('❌ Erro ao alterar status:', err);
    res.status(500).json({ message: 'Erro ao alterar status no banco de dados.' });
  }
}

export async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    const usuarioNome = req.user.nome;

    const [rows] = await db.query('SELECT numero_pedido FROM pedidos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Pedido não encontrado.' });

    const num = rows[0].numero_pedido;
    await db.query('DELETE FROM pedidos WHERE id = ?', [id]);
    await recordHistory(id, req.user.id, `${usuarioNome} excluiu o pedido #${num}.`);
    res.json({ message: 'Pedido excluído!' });
  } catch (err) {
    console.error('❌ Erro ao excluir pedido:', err);
    res.status(500).json({ message: 'Erro ao excluir pedido no banco de dados.' });
  }
}

