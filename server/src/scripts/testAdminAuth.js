const dotenv = require('dotenv');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const connectDB = require('../config/db');
const http = require('http');

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Admin Role Authorization Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  await connectDB();

  // Create temporary express app to test middleware
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Dummy protected admin endpoint
  app.get('/api/admin-only', protect, authorize('admin'), (req, res) => {
    res.status(200).json({ success: true, message: 'Admin access granted' });
  });

  const server = http.createServer(app);
  
  await new Promise((resolve) => {
    server.listen(5005, () => resolve());
  });

  const BASE_URL = 'http://localhost:5005/api';

  async function makeRequest(path, method = 'GET', cookies = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookies) headers['Cookie'] = cookies;

    try {
      const response = await fetch(`${BASE_URL}${path}`, { method, headers });
      const data = await response.json();
      return { status: response.status, data };
    } catch (err) {
      return { status: 500, data: { message: err.message } };
    }
  }

  // Helpers to generate tokens
  const generateCookie = (userId) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return `token=${token}`;
  };

  try {
    // We assume testplayer and testspectator were created by testAuth.js, and admin by seedAdmin.js
    const admin = await User.findOne({ role: 'admin' });
    const player = await User.findOne({ role: 'player' });
    const spectator = await User.findOne({ role: 'spectator' });

    if (!admin || !player || !spectator) {
      console.log('⚠️  Test users missing. Please ensure testAuth.js has been run recently to populate the DB.');
    } else {
      console.log('--- Role Authorization Middleware Tests ---');

      // 1. Unauthenticated -> 401
      const resUnauth = await makeRequest('/admin-only', 'GET');
      assert(resUnauth.status === 401, 'Unauthenticated -> admin endpoint -> UNAUTHORIZED (401)');

      // 2. Spectator -> 403
      const spectatorCookie = generateCookie(spectator._id);
      const resSpec = await makeRequest('/admin-only', 'GET', spectatorCookie);
      assert(resSpec.status === 403, 'Spectator -> admin endpoint -> FORBIDDEN (403)');

      // 3. Player -> 403
      const playerCookie = generateCookie(player._id);
      const resPlayer = await makeRequest('/admin-only', 'GET', playerCookie);
      assert(resPlayer.status === 403, 'Player -> admin endpoint -> FORBIDDEN (403)');

      // 4. Admin -> 200
      const adminCookie = generateCookie(admin._id);
      const resAdmin = await makeRequest('/admin-only', 'GET', adminCookie);
      assert(resAdmin.status === 200, 'Admin -> admin endpoint -> ALLOWED (200)');
    }
  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
