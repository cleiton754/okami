import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './src/config/database.js';
import { login, me } from './src/controllers/authController.js';
import { getOrders, createOrder, updateOrder, updateStatus, deleteOrder } from './src/controllers/orderController.js';
import { getUsers, createUser, updateUser, toggleUserStatus } from './src/controllers/userController.js';
import { getHistory } from './src/controllers/historyController.js';
import { getDashboardStats } from './src/controllers/dashboardController.js';

import { authenticateToken } from './src/middleware/auth.js';
import { requireRole } from './src/middleware/roles.js';
import { upload } from './src/middleware/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
  'https://okami-producao.studiodesignweb.com.br',
  'https://www.okami-producao.studiodesignweb.com.br',
  'https://okami-b6zfht45t-okami-producao.vercel.app',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors({
  origin: false,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware para garantir que o banco esteja pronto antes das rotas
app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/api/health') return next();
  try {
    await initDatabase();
    next();
  } catch (err) {
    console.error('❌ Erro na conexão com banco de dados:', err);
    res.status(500).json({ message: 'Erro ao conectar ao banco de dados MySQL na Hostinger.' });
  }
});

// Health checks e raiz
app.get('/', (req, res) => res.json({ status: 'OK', app: 'Okami Vanilla API', mode: 'vercel', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'OK', app: 'Okami Vanilla API', timestamp: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'OK', app: 'Okami Vanilla API', timestamp: new Date().toISOString() }));

const router = express.Router();

router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, me);

router.get('/pedidos', authenticateToken, getOrders);
router.post('/pedidos', authenticateToken, requireRole('admin'), upload.fields([
  { name: 'arte_frente', maxCount: 1 },
  { name: 'arte_verso', maxCount: 1 },
  { name: 'arquivos_extras', maxCount: 5 }
]), createOrder);

router.put('/pedidos/:id', authenticateToken, requireRole('admin'), upload.fields([
  { name: 'arte_frente', maxCount: 1 },
  { name: 'arte_verso', maxCount: 1 }
]), updateOrder);

router.patch('/pedidos/:id/status', authenticateToken, requireRole('admin', 'producao'), updateStatus);
router.delete('/pedidos/:id', authenticateToken, requireRole('admin'), deleteOrder);

router.get('/usuarios', authenticateToken, requireRole('admin'), getUsers);
router.post('/usuarios', authenticateToken, requireRole('admin'), createUser);
router.put('/usuarios/:id', authenticateToken, requireRole('admin'), updateUser);
router.patch('/usuarios/:id/status', authenticateToken, requireRole('admin'), toggleUserStatus);

router.get('/historico', authenticateToken, getHistory);
router.get('/dashboard/stats', authenticateToken, getDashboardStats);

// Aceita tanto https://dominio.com/api/... quanto https://dominio.com/...
app.use('/api', router);
app.use('/', router);


// Handler de erros global para evitar erros 500 sem CORS
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor.'
  });
});

export default app;


