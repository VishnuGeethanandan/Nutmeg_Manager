const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const configRoutes = require('./routes/configRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const captainRequestRoutes = require('./routes/captainRequestRoutes');
const teamRoutes = require('./routes/teamRoutes');
const squadRoutes = require('./routes/squadRoutes');
const matchRoutes = require('./routes/matchRoutes');

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

// --- Static file serving (uploaded photos) ---
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Routes ---
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Nutmeg Manager API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/config', configRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/captain-requests', captainRequestRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/squad', squadRoutes);
app.use('/api/matches', matchRoutes);

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
