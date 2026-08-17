USE okami_producao;

-- Admin: admin@okami.com | Senha: admin123
-- Producao: producao@okami.com | Senha: producao123
INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo)
VALUES 
('Administrador Okami', 'admin@okami.com', '$2a$10$8.uXF/v5bV7r9T0W.m.4O.Qk5r2m6mQz6A9/hY8X7u6Z5y4X3w2v1', 'admin', 1),
('Operador Produção', 'producao@okami.com', '$2a$10$8.uXF/v5bV7r9T0W.m.4O.Qk5r2m6mQz6A9/hY8X7u6Z5y4X3w2v1', 'producao', 1)
ON DUPLICATE KEY UPDATE id=id;
