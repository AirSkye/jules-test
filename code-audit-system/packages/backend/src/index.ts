import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import ruleRoutes from './routes/ruleRoutes';

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Root Route
app.get('/', (req: Request, res: Response) => {
  res.send('Code Audit System Backend is running!');
});

// API Routes
app.use('/api', ruleRoutes); // Mount rule routes under /api

// Start Server
app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
