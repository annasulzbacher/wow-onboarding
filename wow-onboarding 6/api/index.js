// Entrypoint serverless do Vercel: reexporta o app Express de server.js.
// Localmente (npm start) o server.js sobe a porta; no Vercel ele é usado como handler.
import app from '../server.js';
export default app;
