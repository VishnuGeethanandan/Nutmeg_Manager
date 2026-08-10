/**
 * Module 2 — Player Profile E2E Test Suite
 *
 * Tests: Profile creation, uniqueness, authorization, ownership, editing, and data security.
 *
 * Prerequisites:
 *   - Server running on http://localhost:5000
 *   - MongoDB connected
 *   - Admin seeded (admin@nutmeg.com / Admin@123)
 *
 * Run: node src/scripts/testPlayerProfile.js
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Player = require('../models/Player');
const connectDB = require('../config/db');

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Module 2 — Player Profile Management Tests...\n');

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

  const BASE_URL = 'http://localhost:5000/api';

  // --- Cleanup test data ---
  await User.deleteMany({
    email: {
      $in: [
        'profileplayer1@nutmeg.com',
        'profileplayer2@nutmeg.com',
        'profilespectator@nutmeg.com',
      ],
    },
  });
  await Player.deleteMany({
    admissionNumber: { $in: ['TESTADM001', 'TESTADM002'] },
  });

  // --- Helper: HTTP Request ---
  async function makeRequest(path, method = 'GET', body = null, cookies = null, isFormData = false) {
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (cookies) headers['Cookie'] = cookies;

    const options = { method, headers };

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        body: isFormData ? body : body ? JSON.stringify(body) : null,
      });

      const setCookie = response.headers.get('set-cookie');
      let data = {};
      try {
        data = await response.json();
      } catch (e) {}

      return { status: response.status, data, setCookie };
    } catch (err) {
      console.error('Request error:', err.message);
      return { status: 500, data: { message: err.message } };
    }
  }

  // ====================================================
  // SETUP: Register test users
  // ====================================================
  console.log('--- 0. Setup: Register Test Users ---');

  const regPlayer1 = await makeRequest('/auth/register', 'POST', {
    name: 'Test Player One',
    email: 'profileplayer1@nutmeg.com',
    password: 'Password123',
    role: 'player',
  });
  assert(regPlayer1.status === 201, 'Player 1 registered successfully');
  const player1Cookie = regPlayer1.setCookie ? regPlayer1.setCookie.split(';')[0] : '';

  const regPlayer2 = await makeRequest('/auth/register', 'POST', {
    name: 'Test Player Two',
    email: 'profileplayer2@nutmeg.com',
    password: 'Password123',
    role: 'player',
  });
  assert(regPlayer2.status === 201, 'Player 2 registered successfully');
  const player2Cookie = regPlayer2.setCookie ? regPlayer2.setCookie.split(';')[0] : '';

  const regSpectator = await makeRequest('/auth/register', 'POST', {
    name: 'Test Spectator',
    email: 'profilespectator@nutmeg.com',
    password: 'Password123',
    role: 'spectator',
  });
  assert(regSpectator.status === 201, 'Spectator registered successfully');
  const spectatorCookie = regSpectator.setCookie ? regSpectator.setCookie.split(';')[0] : '';

  // Get admin cookie
  const loginAdmin = await makeRequest('/auth/login', 'POST', {
    email: 'admin@nutmeg.com',
    password: 'Admin@123',
  });
  const adminCookie = loginAdmin.setCookie ? loginAdmin.setCookie.split(';')[0] : '';

  // ====================================================
  // 1. AUTHORIZATION TESTS
  // ====================================================
  console.log('\n--- 1. Authorization Tests ---');

  const noAuthGet = await makeRequest('/players/me');
  assert(noAuthGet.status === 401, 'GET /players/me without auth returns 401');

  const spectatorGet = await makeRequest('/players/me', 'GET', null, spectatorCookie);
  assert(spectatorGet.status === 403, 'Spectator GET /players/me returns 403 Forbidden');

  const adminGet = await makeRequest('/players/me', 'GET', null, adminCookie);
  assert(adminGet.status === 403, 'Admin GET /players/me returns 403 Forbidden (admin is not player)');

  const spectatorPost = await makeRequest('/players/profile', 'POST', {
    name: 'Hacker',
    admissionNumber: 'HACK001',
    departmentName: 'MCA',
    position: 'Forward',
    jerseyNumber: 10,
  }, spectatorCookie);
  assert(spectatorPost.status === 403, 'Spectator POST /players/profile returns 403');

  // ====================================================
  // 2. CONFIG ENDPOINTS
  // ====================================================
  console.log('\n--- 2. Config Endpoints ---');

  const deptRes = await makeRequest('/config/departments');
  assert(deptRes.status === 200, 'GET /config/departments returns 200');
  assert(Array.isArray(deptRes.data.departments), 'Departments is an array');
  assert(deptRes.data.departments.length === 8, 'Departments has exactly 8 entries');
  assert(deptRes.data.departments.includes('MCA'), 'Departments include MCA');
  assert(deptRes.data.departments.includes('RAE'), 'Departments include RAE');

  const posRes = await makeRequest('/config/positions');
  assert(posRes.status === 200, 'GET /config/positions returns 200');
  assert(posRes.data.positions.includes('Goalkeeper'), 'Positions include Goalkeeper');

  // ====================================================
  // 3. PROFILE CREATION TESTS
  // ====================================================
  console.log('\n--- 3. Profile Creation Tests ---');

  // Profile not found before creation
  const noProfile = await makeRequest('/players/me', 'GET', null, player1Cookie);
  assert(noProfile.status === 404, 'GET /players/me returns 404 before profile creation');

  // Missing required fields
  const missingFields = await makeRequest('/players/profile', 'POST', {
    name: 'Test',
  }, player1Cookie);
  assert(missingFields.status === 400, 'Missing required fields returns 400');

  // Invalid department
  const invalidDept = await makeRequest('/players/profile', 'POST', {
    name: 'Test Player One',
    admissionNumber: 'TESTADM001',
    departmentName: 'FAKE_DEPT',
    position: 'Forward',
    jerseyNumber: 10,
  }, player1Cookie);
  assert(invalidDept.status === 400, 'Invalid department returns 400');

  // Invalid position
  const invalidPos = await makeRequest('/players/profile', 'POST', {
    name: 'Test Player One',
    admissionNumber: 'TESTADM001',
    departmentName: 'MCA',
    position: 'Striker',
    jerseyNumber: 10,
  }, player1Cookie);
  assert(invalidPos.status === 400, 'Invalid position returns 400');

  // Invalid jersey number
  const invalidJersey = await makeRequest('/players/profile', 'POST', {
    name: 'Test Player One',
    admissionNumber: 'TESTADM001',
    departmentName: 'MCA',
    position: 'Forward',
    jerseyNumber: 100,
  }, player1Cookie);
  assert(invalidJersey.status === 400, 'Jersey number > 99 returns 400');

  // Successful profile creation
  const createProfile = await makeRequest('/players/profile', 'POST', {
    name: 'Test Player One',
    admissionNumber: 'TESTADM001',
    departmentName: 'MCA',
    phoneNumber: '9876543210',
    position: 'Forward',
    jerseyNumber: 10,
  }, player1Cookie);
  assert(createProfile.status === 201, 'Valid profile creation returns 201');
  assert(createProfile.data.player?.admissionNumber === 'TESTADM001', 'Admission number stored correctly (uppercase)');
  assert(createProfile.data.player?.departmentName === 'MCA', 'Department stored correctly');
  assert(createProfile.data.player?.position === 'Forward', 'Position stored correctly');
  assert(createProfile.data.player?.jerseyNumber === 10, 'Jersey number stored correctly');
  assert(!createProfile.data.player?.passwordHash, 'No passwordHash in profile response');

  // ====================================================
  // 4. DUPLICATE PREVENTION TESTS
  // ====================================================
  console.log('\n--- 4. Duplicate Prevention Tests ---');

  // Duplicate profile for same user
  const dupProfile = await makeRequest('/players/profile', 'POST', {
    name: 'Test Player One Again',
    admissionNumber: 'TESTADM999',
    departmentName: 'CSE',
    position: 'Midfielder',
    jerseyNumber: 7,
  }, player1Cookie);
  assert(dupProfile.status === 409, 'Duplicate profile for same user returns 409');

  // Duplicate admission number by different user
  const dupAdmission = await makeRequest('/players/profile', 'POST', {
    name: 'Test Player Two',
    admissionNumber: 'TESTADM001',
    departmentName: 'CSE',
    position: 'Defender',
    jerseyNumber: 4,
  }, player2Cookie);
  assert(dupAdmission.status === 409, 'Duplicate admission number returns 409');

  // ====================================================
  // 5. PROFILE READ TESTS
  // ====================================================
  console.log('\n--- 5. Profile Read Tests ---');

  const getProfile = await makeRequest('/players/me', 'GET', null, player1Cookie);
  assert(getProfile.status === 200, 'GET /players/me returns 200 for profile owner');
  assert(getProfile.data.player?.name === 'Test Player One', 'Profile returns correct name');
  assert(getProfile.data.player?.admissionNumber === 'TESTADM001', 'Profile returns correct admission number');
  assert(!getProfile.data.player?.passwordHash, 'No passwordHash in GET response');
  assert(!getProfile.data.player?.__v && getProfile.data.player?.__v !== 0, 'No __v in GET response');

  // ====================================================
  // 6. PROFILE UPDATE TESTS
  // ====================================================
  console.log('\n--- 6. Profile Update Tests ---');

  // Update allowed fields
  const updateProfile = await makeRequest('/players/me', 'PUT', {
    name: 'Test Player Updated',
    position: 'Midfielder',
    jerseyNumber: 7,
    phoneNumber: '1234567890',
  }, player1Cookie);
  assert(updateProfile.status === 200, 'PUT /players/me returns 200');
  assert(updateProfile.data.player?.name === 'Test Player Updated', 'Name updated correctly');
  assert(updateProfile.data.player?.position === 'Midfielder', 'Position updated correctly');
  assert(updateProfile.data.player?.jerseyNumber === 7, 'Jersey number updated correctly');

  // Verify name sync to users collection
  const meAfterUpdate = await makeRequest('/auth/me', 'GET', null, player1Cookie);
  assert(meAfterUpdate.data.user?.name === 'Test Player Updated', 'Name synced to users collection');

  // Protected fields should NOT change
  const protectedUpdate = await makeRequest('/players/me', 'PUT', {
    admissionNumber: 'HACKED001',
    departmentName: 'CSE',
    isCaptain: true,
    teamId: '507f1f77bcf86cd799439011',
  }, player1Cookie);
  assert(protectedUpdate.status === 200, 'PUT with protected fields does not error (fields ignored)');

  // Verify protected fields unchanged
  const verifyProtected = await makeRequest('/players/me', 'GET', null, player1Cookie);
  assert(verifyProtected.data.player?.admissionNumber === 'TESTADM001', 'Admission number NOT changed by PUT');
  assert(verifyProtected.data.player?.departmentName === 'MCA', 'Department NOT changed by PUT');
  assert(verifyProtected.data.player?.isCaptain === false, 'isCaptain NOT changed by PUT');
  assert(verifyProtected.data.player?.teamId === null, 'teamId NOT changed by PUT');

  // ====================================================
  // 7. DATA SECURITY TESTS
  // ====================================================
  console.log('\n--- 7. Data Security Tests ---');

  const secProfile = await makeRequest('/players/me', 'GET', null, player1Cookie);
  const profileJson = JSON.stringify(secProfile.data);
  assert(!profileJson.includes('passwordHash'), 'No passwordHash anywhere in profile response JSON');
  assert(!profileJson.includes('JWT_SECRET'), 'No JWT_SECRET in response');

  // ====================================================
  // SUMMARY
  // ====================================================
  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  // --- Cleanup ---
  await User.deleteMany({
    email: {
      $in: [
        'profileplayer1@nutmeg.com',
        'profileplayer2@nutmeg.com',
        'profilespectator@nutmeg.com',
      ],
    },
  });
  await Player.deleteMany({
    admissionNumber: { $in: ['TESTADM001', 'TESTADM002'] },
  });

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
