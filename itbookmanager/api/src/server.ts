import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './db';
import { authMiddleware } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import apiRouter from './routes/index';
import { getQrImage } from './controllers/mdm/tablets.controller';
import { getQrImage as getMemberQrImage } from './controllers/crm/members.controller';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'https://lasitbkmanager.web.app'] }));
app.use(express.json());

// Health check (인증 불필요)
app.get('/health', async (req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// QR 이미지 (인증 불필요 - img 태그에서 직접 로드)
app.get('/api/v1/tablets/:id/qr-image', getQrImage);
app.get('/api/v1/members/:id/qr-image', getMemberQrImage);

// API 라우터 (인증 필요)
app.use('/api/v1', authMiddleware, apiRouter);

app.use(errorMiddleware);

// 더 이상 server.ts에서 직접 listen하지 않습니다 (배포 환경 포트 충돌 방지)
// 로컬 실행용은 src/start.ts를 이용하세요.

export default app;
