CREATE DATABASE IF NOT EXISTS okami_producao DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE okami_producao;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  cargo ENUM('admin', 'producao') NOT NULL DEFAULT 'producao',
  ativo BOOLEAN DEFAULT TRUE,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arquivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  tipo ENUM('frente', 'verso', 'extra') NOT NULL,
  formato VARCHAR(50),
  CONSTRAINT fk_arquivos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  usuario_id INT NOT NULL,
  acao TEXT NOT NULL,
  data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historico_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_historico_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
