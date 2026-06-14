import 'dotenv/config';
import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3002;

app.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT}`);
});
