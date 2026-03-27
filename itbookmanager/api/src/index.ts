import * as functions from 'firebase-functions';
import app from './server';

// Firebase Functions 래핑
// Cloud Functions에서 'api'라는 이름으로 Express 앱을 노출합니다.
export const api = functions.https.onRequest(app);
