import { db } from '../config/database.js';

export async function getDashboardStats(req, res) {
  try {
    const { loja, produto, status, data, busca } = req.query;

    let sqlWhere = ` WHERE status != 'Arquivado'`;
    const params = [];
    if (loja) { sqlWhere += ` AND loja = ?`; params.push(loja); }
    if (produto) { sqlWhere += ` AND produto = ?`; params.push(produto); }
    if (status) { sqlWhere += ` AND status = ?`; params.push(status); }
    if (data) { sqlWhere += ` AND data_pedido = ?`; params.push(data); }
    if (busca) { sqlWhere += ` AND (titulo LIKE ? OR numero_pedido LIKE ?)`; params.push(`%${busca}%`, `%${busca}%`); }

    const [rows] = await db.query(`
      SELECT 
        COUNT(*) AS total_pedidos,
        SUM(CASE WHEN produto = 'Bloquinho' THEN quantidade ELSE 0 END) AS total_bloquinhos,
        SUM(CASE WHEN produto = 'Caderneta' THEN quantidade ELSE 0 END) AS total_cadernetas,
        SUM(CASE WHEN produto = 'Agenda' THEN quantidade ELSE 0 END) AS total_agendas,
        SUM(CASE WHEN status = 'Aguardando Impressão' THEN 1 ELSE 0 END) AS aguardando_impressao,
        SUM(CASE WHEN status = 'Impresso' THEN 1 ELSE 0 END) AS impressos,
        SUM(CASE WHEN status = 'Cortado' THEN 1 ELSE 0 END) AS cortados,
        SUM(CASE WHEN status = 'Montado' THEN 1 ELSE 0 END) AS montados,
        SUM(CASE WHEN status = 'Pronto' THEN 1 ELSE 0 END) AS prontos,
        SUM(CASE WHEN status = 'Enviado' THEN 1 ELSE 0 END) AS enviados
      FROM pedidos ${sqlWhere}
    `, params);

    const s = rows[0] || {};
    res.json({
      total_pedidos: Number(s.total_pedidos || 0),
      total_bloquinhos: Number(s.total_bloquinhos || 0),
      total_cadernetas: Number(s.total_cadernetas || 0),
      total_agendas: Number(s.total_agendas || 0),
      aguardando_impressao: Number(s.aguardando_impressao || 0),
      impressos: Number(s.impressos || 0),
      cortados: Number(s.cortados || 0),
      montados: Number(s.montados || 0),
      prontos: Number(s.prontos || 0),
      enviados: Number(s.enviados || 0)
    });
  } catch (err) {
    console.error('❌ Erro ao carregar estatísticas do dashboard:', err);
    res.status(500).json({ message: 'Erro ao obter estatísticas do banco de dados.' });
  }
}

