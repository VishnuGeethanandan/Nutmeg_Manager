const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Player = require('../models/Player');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const Tournament = require('../models/Tournament');
const connectDB = require('../config/db');

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Module 4 Squad Selection Tests...\n');

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

  // --- Clean DB ---
  await User.deleteMany({ email: { $regex: 'squadtest' } });
  await Player.deleteMany({ admissionNumber: { $regex: 'SQUADTEST' } });
  await Team.deleteMany({ name: 'Squad Test Team' });
  await Tournament.deleteMany({ name: 'Squad Test Tournament' });
  await TeamMembership.deleteMany({});

  const BASE_URL = 'http://localhost:5000/api';

  async function makeAuthRequest(path, method = 'GET', body = null, cookie = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {}

      return { status: response.status, data };
    } catch (err) {
      console.error('Request error:', err.message);
      return { status: 500, data: { message: err.message } };
    }
  }

  // --- Setup Data via DB directly for prerequisite modules ---
  
  // 1. Create Tournament
  const tournament = await Tournament.create({
    name: 'Squad Test Tournament',
    year: 2026,
    status: 'upcoming',
    maxTeams: 8
  });

  // 2. Create Captain User & Player
  const captainUser = await User.create({
    name: 'Captain SquadTest',
    email: 'captain@squadtest.com',
    passwordHash: 'dummy123',
    role: 'player'
  });
  const captain = await Player.create({
    userId: captainUser._id,
    name: 'Captain SquadTest',
    admissionNumber: 'SQUADTEST_CAPT',
    departmentName: 'MCA',
    position: 'Midfielder',
    jerseyNumber: 10,
    isCaptain: true
  });

  // 3. Create Team and assign Captain
  const team = await Team.create({
    name: 'Squad Test Team',
    tournamentId: tournament._id,
    captainId: captain._id
  });

  // 4. Create an eligible player in the same department
  const eligibleUser = await User.create({
    name: 'Eligible SquadTest',
    email: 'eligible@squadtest.com',
    passwordHash: 'dummy123',
    role: 'player'
  });
  const eligiblePlayer = await Player.create({
    userId: eligibleUser._id,
    name: 'Eligible SquadTest',
    admissionNumber: 'SQUADTEST_ELIGIBLE',
    departmentName: 'MCA',
    position: 'Forward',
    jerseyNumber: 9
  });

  // 5. Create an ineligible player (different department)
  const otherDeptUser = await User.create({
    name: 'OtherDept SquadTest',
    email: 'otherdept@squadtest.com',
    passwordHash: 'dummy123',
    role: 'player'
  });
  const otherDeptPlayer = await Player.create({
    userId: otherDeptUser._id,
    name: 'OtherDept SquadTest',
    admissionNumber: 'SQUADTEST_OTHER',
    departmentName: 'CE',
    position: 'Defender',
    jerseyNumber: 5
  });

  // --- Generate JWT for Captain ---
  // A quick way is to login if we know password, but since we created user manually with 'dummy' hash, 
  // we need a valid login. Let's create the user via API instead.
  await User.deleteMany({ email: 'captain@squadtest.com' });
  await Player.deleteMany({ admissionNumber: 'SQUADTEST_CAPT' });
  
  // Create captain via API to get cookie
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Captain SquadTest',
      email: 'captain@squadtest.com',
      password: 'Password123',
      role: 'player'
    })
  });
  const captainCookie = regRes.headers.get('set-cookie')?.split(';')[0];
  const capData = await regRes.json();
  const capUserId = capData.user._id;

  // Create player profile via API
  await makeAuthRequest('/players/profile', 'POST', {
    name: 'Captain SquadTest',
    admissionNumber: 'SQUADTEST_CAPT',
    departmentName: 'MCA',
    position: 'Midfielder',
    jerseyNumber: 10
  }, captainCookie);

  // Re-fetch player to get ID and make them captain
  const apiCaptain = await Player.findOne({ userId: capUserId });
  apiCaptain.isCaptain = true;
  await apiCaptain.save();
  
  team.captainId = apiCaptain._id;
  await team.save();
  
  // Add captain to team membership
  await TeamMembership.create({
    playerId: apiCaptain._id,
    teamId: team._id,
    tournamentId: tournament._id
  });

  console.log('\n--- 1. Fetching Team & Eligible Players ---');

  // Test 1.1: Get My Team
  const teamRes = await makeAuthRequest(`/squad/my-team?tournamentId=${tournament._id}`, 'GET', null, captainCookie);
  assert(teamRes.status === 200, 'GET /squad/my-team returns 200 OK');
  assert(teamRes.data.team?.name === 'Squad Test Team', 'Returns correct team');
  assert(teamRes.data.roster?.length === 1, 'Roster contains the captain initially');

  // Test 1.2: Get Eligible Players
  const eligibleRes = await makeAuthRequest(`/squad/eligible-players?tournamentId=${tournament._id}`, 'GET', null, captainCookie);
  assert(eligibleRes.status === 200, 'GET /squad/eligible-players returns 200 OK');
  
  const eligibleList = eligibleRes.data.players;
  assert(eligibleList.some(p => p.admissionNumber === 'SQUADTEST_ELIGIBLE'), 'Eligible list includes same-department player');
  assert(!eligibleList.some(p => p.admissionNumber === 'SQUADTEST_OTHER'), 'Eligible list EXCLUDES different-department player');
  assert(!eligibleList.some(p => p.admissionNumber === 'SQUADTEST_CAPT'), 'Eligible list EXCLUDES players already in a team');

  console.log('\n--- 2. Direct Player Selection (Add to Squad) ---');

  // Test 2.1: Add different department player
  const addOtherRes = await makeAuthRequest(`/squad/roster`, 'POST', {
    tournamentId: tournament._id,
    playerId: otherDeptPlayer._id
  }, captainCookie);
  assert(addOtherRes.status === 400, 'Cannot add player from different department');

  // Test 2.2: Add eligible player
  const addEligibleRes = await makeAuthRequest(`/squad/roster`, 'POST', {
    tournamentId: tournament._id,
    playerId: eligiblePlayer._id
  }, captainCookie);
  assert(addEligibleRes.status === 201, 'Successfully added eligible player to squad');
  assert(addEligibleRes.data.success === true, 'Response indicates success');

  // Test 2.3: Prevent adding same player twice
  const addTwiceRes = await makeAuthRequest(`/squad/roster`, 'POST', {
    tournamentId: tournament._id,
    playerId: eligiblePlayer._id
  }, captainCookie);
  assert(addTwiceRes.status === 400, 'Cannot add the same player twice (already assigned)');

  console.log('\n--- 3. Squad Removal ---');

  // Test 3.1: Captain cannot remove themselves
  const removeCaptRes = await makeAuthRequest(`/squad/roster/${apiCaptain._id}?tournamentId=${tournament._id}`, 'DELETE', null, captainCookie);
  assert(removeCaptRes.status === 400, 'Captain cannot remove themselves from squad');

  // Test 3.2: Remove a player
  const removePlayerRes = await makeAuthRequest(`/squad/roster/${eligiblePlayer._id}?tournamentId=${tournament._id}`, 'DELETE', null, captainCookie);
  assert(removePlayerRes.status === 200, 'Successfully removed player from squad');

  // Test 3.3: Player is back in eligible list
  const recheckEligibleRes = await makeAuthRequest(`/squad/eligible-players?tournamentId=${tournament._id}`, 'GET', null, captainCookie);
  assert(recheckEligibleRes.data.players.some(p => p.admissionNumber === 'SQUADTEST_ELIGIBLE'), 'Removed player is back in eligible list');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
