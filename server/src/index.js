const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');

// Load environment variables
dotenv.config();

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // Allow cookies to be sent cross-origin
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Routes ---
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Nutmeg Manager API is running' });
});

app.use('/api/auth', authRoutes);

// --- Global Error Handler (must be after routes) ---
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🏟️  Nutmeg Manager server running on port ${PORT}`);
    console.log(`📡  API: http://localhost:${PORT}/api`);
  });
};

startServer();
