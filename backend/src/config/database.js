import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

let pool = null;
let initPromise = null;

function getDbConfig() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente do banco ausentes: ${missing.join(', ')}`);
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true
  };
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }
  return pool;
}

export async function initDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const activePool = getPool();

      await activePool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          senha_hash VARCHAR(255) NOT NULL,
          cargo ENUM('admin', 'producao') NOT NULL DEFAULT 'producao',
          ativo BOOLEAN DEFAULT TRUE,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS pedidos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          numero_pedido VARCHAR(100) NOT NULL UNIQUE,
          titulo VARCHAR(255) NOT NULL,
          loja ENUM('Okami', 'Universo') NOT NULL,
          produto ENUM('Bloquinho', 'Caderneta', 'Agenda') NOT NULL,
          quantidade INT NOT NULL DEFAULT 1,
          data_pedido DATE NOT NULL,
          tipo_espiral VARCHAR(100) NOT NULL,
          frente_verso BOOLEAN DEFAULT FALSE,
          observacoes TEXT,
          status ENUM('Aguardando Impressão', 'Impresso', 'Cortado', 'Montado', 'Pronto', 'Enviado', 'Arquivado') DEFAULT 'Aguardando Impressão',
          criado_por INT NOT NULL,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_pedidos_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS arquivos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pedido_id INT NOT NULL,
          nome VARCHAR(255) NOT NULL,
          url VARCHAR(500) NOT NULL,
          tipo ENUM('frente', 'verso', 'extra') NOT NULL,
          formato VARCHAR(50),
          CONSTRAINT fk_arquivos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS historico (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pedido_id INT NOT NULL,
          usuario_id INT NOT NULL,
          acao TEXT NOT NULL,
          data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_historico_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
          CONSTRAINT fk_historico_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      const [existing] = await activePool.query('SELECT * FROM usuarios WHERE email = ?', ['admin@okami.com']);
      if (existing.length === 0) {
        const adminHash = await bcrypt.hash('admin123', 10);
        await activePool.query('INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo) VALUES (?, ?, ?, ?, ?)', ['Administrador Okami', 'admin@okami.com', adminHash, 'admin', 1]);
        const prodHash = await bcrypt.hash('producao123', 10);
        await activePool.query('INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo) VALUES (?, ?, ?, ?, ?)', ['Operador Produção', 'producao@okami.com', prodHash, 'producao', 1]);
      }

      console.log('✅ Conexão com o banco de dados MySQL estabelecida com sucesso!');
    } catch (err) {
      console.error('❌ Erro ao inicializar o banco MySQL:', err.message || err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export const db = {
  isFallback: () => false,
  query: async (sql, params = []) => {
    const p = getPool();
    return p.query(sql, params);
  }
};

