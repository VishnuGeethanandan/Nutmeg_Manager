const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Module 1 Authentication & User Management Tests...\n');

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

  // Clean test users (except seeded admin)
  await User.deleteMany({ email: { $in: ['testplayer@nutmeg.com', 'testspectator@nutmeg.com', 'testadmin@nutmeg.com'] } });

  const BASE_URL = 'http://localhost:5000/api/auth';

  async function makeRequest(path, method = 'GET', body = null, cookies = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookies) headers['Cookie'] = cookies;

    const options = {
      method,
      headers,
    };

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        body: body ? JSON.stringify(body) : null,
      });

      const setCookie = response.headers.get('set-cookie');
      let data = {};
      try {
        data = await response.json();
      } catch (e) {}

      return {
        status: response.status,
        data,
        setCookie,
      };
    } catch (err) {
      console.error('Request error:', err.message);
      return { status: 500, data: { message: err.message } };
    }
  }

  console.log('--- 1. Registration Tests ---');

  // Test 1.1: Register a Player account
  const regPlayer = await makeRequest('/register', 'POST', {
    name: 'Test Player',
    email: 'testplayer@nutmeg.com',
    password: 'PlayerPassword123',
    role: 'player',
    phoneNumber: '9876543210'
  });
  assert(regPlayer.status === 201, 'Player registration returns 201 Created');
  assert(regPlayer.data.success === true, 'Player registration response contains success: true');
  assert(regPlayer.data.user?.role === 'player', 'Registered user role is player');
  assert(!regPlayer.data.user?.passwordHash, 'Password hash is NOT exposed in registration response');
  assert(regPlayer.setCookie && regPlayer.setCookie.includes('token='), 'HttpOnly token cookie is set on registration');
  const playerCookie = regPlayer.setCookie ? regPlayer.setCookie.split(';')[0] : '';

  // Test 1.2: Register a Spectator account
  const regSpec = await makeRequest('/register', 'POST', {
    name: 'Test Spectator',
    email: 'testspectator@nutmeg.com',
    password: 'SpectatorPassword123',
    role: 'spectator'
  });
  assert(regSpec.status === 201, 'Spectator registration returns 201 Created');
  assert(regSpec.data.user?.role === 'spectator', 'Registered user role is spectator');

  // Test 1.3: Reject public Admin registration
  const regAdmin = await makeRequest('/register', 'POST', {
    name: 'Hacker Admin',
    email: 'testadmin@nutmeg.com',
    password: 'AdminPassword123',
    role: 'admin'
  });
  assert(regAdmin.status === 403, 'Public admin registration is blocked with 403 Forbidden');

  // Test 1.4: Reject Duplicate Email
  const regDup = await makeRequest('/register', 'POST', {
    name: 'Duplicate Player',
    email: 'testplayer@nutmeg.com',
    password: 'Password123',
    role: 'player'
  });
  assert(regDup.status === 409, 'Duplicate email registration is rejected with 409 Conflict');

  // Test 1.5: Reject Invalid Validation (short password)
  const regShortPass = await makeRequest('/register', 'POST', {
    name: 'Short Pass',
    email: 'shortpass@nutmeg.com',
    password: '123',
    role: 'player'
  });
  assert(regShortPass.status === 400, 'Short password (< 6 chars) rejected with 400 Bad Request');

  console.log('\n--- 2. Login Tests ---');

  // Test 2.1: Login with valid Player credentials
  const loginPlayer = await makeRequest('/login', 'POST', {
    email: 'testplayer@nutmeg.com',
    password: 'PlayerPassword123'
  });
  assert(loginPlayer.status === 200, 'Valid login returns 200 OK');
  assert(loginPlayer.data.user?.email === 'testplayer@nutmeg.com', 'Login returns correct user details');
  assert(!loginPlayer.data.user?.passwordHash, 'Password hash is NOT exposed in login response');
  assert(loginPlayer.setCookie && loginPlayer.setCookie.includes('token='), 'HttpOnly token cookie is set on login');

  // Test 2.2: Login with valid Admin credentials (seeded admin)
  const loginAdmin = await makeRequest('/login', 'POST', {
    email: 'admin@nutmeg.com',
    password: 'Admin@123'
  });
  assert(loginAdmin.status === 200, 'Seeded Admin login returns 200 OK');
  assert(loginAdmin.data.user?.role === 'admin', 'Admin user role is admin');

  // Test 2.3: Login with wrong password
  const loginWrongPass = await makeRequest('/login', 'POST', {
    email: 'testplayer@nutmeg.com',
    password: 'WrongPassword'
  });
  assert(loginWrongPass.status === 401, 'Invalid password rejected with 401 Unauthorized');

  // Test 2.4: Login with non-existent user
  const loginNoUser = await makeRequest('/login', 'POST', {
    email: 'nobody@nutmeg.com',
    password: 'Password123'
  });
  assert(loginNoUser.status === 401, 'Non-existent user rejected with 401 Unauthorized');
  assert(loginNoUser.data.message === 'Invalid email or password.', 'Generic error message used to prevent account enumeration');

  console.log('\n--- 3. Session & Authentication Middleware (/auth/me) Tests ---');

  // Test 3.1: Get current user with valid cookie
  const meRes = await makeRequest('/me', 'GET', null, playerCookie);
  assert(meRes.status === 200, 'GET /auth/me with valid cookie returns 200 OK');
  assert(meRes.data.user?.name === 'Test Player', 'GET /auth/me returns authenticated user details');

  // Test 3.2: Get current user WITHOUT cookie
  const meNoAuth = await makeRequest('/me', 'GET');
  assert(meNoAuth.status === 401, 'GET /auth/me without cookie is rejected with 401 Unauthorized');

  console.log('\n--- 4. Logout Tests ---');

  // Test 4.1: Logout
  const logoutRes = await makeRequest('/logout', 'POST', null, playerCookie);
  assert(logoutRes.status === 200, 'POST /auth/logout returns 200 OK');
  assert(logoutRes.setCookie && logoutRes.setCookie.includes('token=;'), 'Logout clears the token cookie');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
