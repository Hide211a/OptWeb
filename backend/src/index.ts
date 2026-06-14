import 'dotenv/config';
import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3002;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`API listening on ${HOST}:${PORT}`);
});
