import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  // Cloud Functions 환경에서는 파라미터 없이 인스턴스 초기화 가능
  if (process.env.FUNCTIONS_EMULATOR || process.env.K_SERVICE) {
    admin.initializeApp();
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FB_STORAGE_BUCKET,
    });
  }
}

export default admin;
