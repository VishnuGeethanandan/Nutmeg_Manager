const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const CaptainRequest = require('../models/CaptainRequest');
const TeamMembership = require('../models/TeamMembership');
const connectDB = require('../config/db');

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Module 3 Team & Captain Management Tests...\n');

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

  // Clear previous module 3 test data
  await Team.deleteMany({ name: { $regex: /^TestTeam/ } });
  await CaptainRequest.deleteMany({});
  await TeamMembership.deleteMany({});
  
  const BASE_URL = 'http://localhost:5000/api';

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
      return { status: 500, data: { message: err.message } };
    }
  }

  const register = async (email, password, role) => {
    await makeRequest('/auth/register', 'POST', {
      name: `Test ${role}`,
      email,
      password,
      role
    });
  };

  // Clean test users (except seeded admin)
  await User.deleteMany({ email: { $in: ['m3player1@nutmeg.com', 'm3player2@nutmeg.com', 'm3spec@nutmeg.com'] } });
  
  await register('m3player1@nutmeg.com', 'Password123', 'player');
  await register('m3player2@nutmeg.com', 'Password123', 'player');
  await register('m3spec@nutmeg.com', 'Password123', 'spectator');

  // Helper to login
  const login = async (email, password) => {
    const res = await makeRequest('/auth/login', 'POST', { email, password });
    return res.setCookie ? res.setCookie.split(';')[0] : '';
  };

  // Create player profiles for the players
  const p1Cookie = await login('m3player1@nutmeg.com', 'Password123');
  const p2Cookie = await login('m3player2@nutmeg.com', 'Password123');
  const adminCookie = await login('admin@nutmeg.com', 'Admin@123');
  const specCookie = await login('m3spec@nutmeg.com', 'Password123');

  const prof1 = await makeRequest('/players/profile', 'POST', {
      name: 'Player One',
      admissionNumber: 'M3A101',
      departmentName: 'MCA',
      position: 'Forward',
      jerseyNumber: 10
  }, p1Cookie);
  if (prof1.status !== 201) console.error('prof1 failed:', prof1);

  const prof2 = await makeRequest('/players/profile', 'POST', {
      name: 'Player Two',
      admissionNumber: 'M3A102',
      departmentName: 'RAE',
      position: 'Midfielder',
      jerseyNumber: 8
  }, p2Cookie);
  if (prof2.status !== 201) console.error('prof2 failed:', prof2);

  // Get active tournament
  const tournament = await Tournament.findOne({ year: 2026 });
  if (!tournament) {
      console.error('❌ Tournament not found. Did you run seed:tournament?');
      process.exit(1);
  }

  if (!adminCookie || !p1Cookie || !p2Cookie || !specCookie) {
      console.error('❌ Missing auth cookies.');
      process.exit(1);
  }

  const player1Cookie = p1Cookie;
  const player2Cookie = p2Cookie;

  console.log('\n--- 1. Captain Request Tests ---');
  
  // 1.1 Player submits request
  const req1 = await makeRequest('/captain-requests', 'POST', { tournamentId: tournament._id }, player1Cookie);
  assert(req1.status === 201, 'Player submits request -> SUCCESS');
  if (req1.status !== 201) console.error(req1.data);
  
  // 1.2 Duplicate pending request
  const req2 = await makeRequest('/captain-requests', 'POST', { tournamentId: tournament._id }, player1Cookie);
  assert(req2.status === 400, 'Duplicate pending request -> REJECTED');

  // 1.3 Spectator submits request
  const req3 = await makeRequest('/captain-requests', 'POST', { tournamentId: tournament._id }, specCookie);
  assert(req3.status === 403, 'Spectator submits request -> REJECTED');

  // 1.4 Unauthenticated request
  const req4 = await makeRequest('/captain-requests', 'POST', { tournamentId: tournament._id });
  assert(req4.status === 401, 'Unauthenticated request -> REJECTED');

  console.log('\n--- 2. Admin Approval Tests ---');

  // Player 2 also requests
  const req5 = await makeRequest('/captain-requests', 'POST', { tournamentId: tournament._id }, player2Cookie);

  // 2.1 Admin views requests
  const viewReqs = await makeRequest('/captain-requests', 'GET', null, adminCookie);
  assert(viewReqs.status === 200 && viewReqs.data.requests.length >= 2, 'Admin views requests -> SUCCESS');

  const p1RequestId = req1.data.captainRequest._id;
  const p2RequestId = req5.data.captainRequest._id;

  // 2.2 Admin approves
  const appRes = await makeRequest(`/captain-requests/${p1RequestId}/approve`, 'PATCH', null, adminCookie);
  assert(appRes.status === 200 && appRes.data.captainRequest.status === 'approved', 'Admin approves -> SUCCESS');

  // 2.3 Admin rejects
  const rejRes = await makeRequest(`/captain-requests/${p2RequestId}/reject`, 'PATCH', null, adminCookie);
  assert(rejRes.status === 200 && rejRes.data.captainRequest.status === 'rejected', 'Admin rejects -> SUCCESS');

  // 2.4 Player approves
  const pAppRes = await makeRequest(`/captain-requests/${p2RequestId}/approve`, 'PATCH', null, player1Cookie);
  assert(pAppRes.status === 403, 'Player approves -> REJECTED');

  console.log('\n--- 3. Team Creation Tests ---');

  // 3.1 Admin creates team
  const t1 = await makeRequest('/teams', 'POST', { name: 'TestTeam A', tournamentId: tournament._id }, adminCookie);
  assert(t1.status === 201, 'Admin creates team -> SUCCESS');

  // 3.2 Player creates team
  const t2 = await makeRequest('/teams', 'POST', { name: 'TestTeam B', tournamentId: tournament._id }, player1Cookie);
  assert(t2.status === 403, 'Player creates team -> REJECTED');

  // 3.3 Duplicate team name
  const t3 = await makeRequest('/teams', 'POST', { name: 'TestTeam A', tournamentId: tournament._id }, adminCookie);
  assert(t3.status === 409, 'Duplicate team name in same tournament -> REJECTED');

  // Create Teams up to 8
  const tIDs = [t1.data.team._id];
  for (let i = 2; i <= 8; i++) {
     const res = await makeRequest('/teams', 'POST', { name: `TestTeam ${i}`, tournamentId: tournament._id }, adminCookie);
     if(res.status === 201) tIDs.push(res.data.team._id);
  }

  // 3.4 Team limit exceeded
  const t9 = await makeRequest('/teams', 'POST', { name: 'TestTeam 9', tournamentId: tournament._id }, adminCookie);
  assert(t9.status === 400, 'Team limit exceeded -> REJECTED');

  console.log('\n--- 4. Captain Assignment Tests ---');
  
  const p1Profile = await Player.findOne({ userId: (await User.findOne({email: 'm3player1@nutmeg.com'}))._id });
  const p2Profile = await Player.findOne({ userId: (await User.findOne({email: 'm3player2@nutmeg.com'}))._id });

  // 4.1 Approved captain -> Team
  const assign1 = await makeRequest(`/teams/${tIDs[0]}`, 'PATCH', { captainId: p1Profile._id }, adminCookie);
  assert(assign1.status === 200, 'Approved captain -> Team -> SUCCESS');

  // 4.2 Unapproved player -> Team
  const assign2 = await makeRequest(`/teams/${tIDs[1]}`, 'PATCH', { captainId: p2Profile._id }, adminCookie);
  assert(assign2.status === 400, 'Unapproved player -> Team captain -> REJECTED');

  // 4.3 Captain assigned to second team
  const assign3 = await makeRequest(`/teams/${tIDs[1]}`, 'PATCH', { captainId: p1Profile._id }, adminCookie);
  assert(assign3.status === 400, 'Captain assigned to second team in same tournament -> REJECTED');

  // 4.4 Second captain assigned to same team
  // First approve player 2
  await makeRequest('/captain-requests', 'POST', { tournamentId: tournament._id }, player2Cookie); // resubmit
  const newReqs = await makeRequest('/captain-requests', 'GET', null, adminCookie);
  const newP2Req = newReqs.data.requests.find(r => r.playerId._id === p2Profile._id.toString() && r.status === 'pending');
  await makeRequest(`/captain-requests/${newP2Req._id}/approve`, 'PATCH', null, adminCookie);
  
  const assign4 = await makeRequest(`/teams/${tIDs[0]}`, 'PATCH', { captainId: p2Profile._id }, adminCookie);
  assert(assign4.status === 400, 'Second captain assigned to same team -> REJECTED');

  console.log('\n--- 5. Team Membership Tests ---');
  // Team membership is tested implicitly by the assignment logic throwing 400 for existing membership.
  // Wait, let's verify one-player-one-team is enforced at DB level
  let m1Success = false;
  try {
      await TeamMembership.create({ playerId: p1Profile._id, teamId: tIDs[1], tournamentId: tournament._id });
  } catch(e) {
      if(e.code === 11000) m1Success = true;
  }
  assert(m1Success, 'Same player -> Team B same tournament -> REJECTED');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
