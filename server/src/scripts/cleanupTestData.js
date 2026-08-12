const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const TeamMembership = require('../models/TeamMembership');
const CaptainRequest = require('../models/CaptainRequest');
const connectDB = require('../config/db');

dotenv.config();

async function cleanup() {
  await connectDB();
  
  console.log('--- STARTING CLEANUP ---');

  // 1. Identify Test Users
  // Keep admin, vishnu, ajaynath, jishnu based on their actual emails
  const keepEmails = [
    'admin@nutmeg.com', 
    'vishnugeethanandan@gmail.com', 
    'ajaynath12@gmail.com', 
    'jishnupm@gmail.com'
  ];
  
  const testUsers = await User.find({ email: { $nin: keepEmails } });
  const testUserIds = testUsers.map(u => u._id);
  
  console.log(`Found ${testUsers.length} test users to delete.`);
  
  // 2. Identify Test Players
  const testPlayers = await Player.find({ userId: { $in: testUserIds } });
  const testPlayerIds = testPlayers.map(p => p._id);
  
  console.log(`Found ${testPlayers.length} test players to delete.`);
  
  // 3. Identify Test Tournaments
  // Keep Nutmeg 2026, delete Squad Test Tournament etc.
  const testTournaments = await Tournament.find({ name: { $regex: 'test', $options: 'i' } });
  const testTournamentIds = testTournaments.map(t => t._id);
  
  console.log(`Found ${testTournaments.length} test tournaments to delete.`);
  
  // 4. Identify Test Teams
  // Delete teams with 'Test' in name, OR captain is a test player, OR linked to a test tournament
  const testTeams = await Team.find({
     $or: [
        { name: { $regex: 'test', $options: 'i' } },
        { captainId: { $in: testPlayerIds } },
        { tournamentId: { $in: testTournamentIds } }
     ]
  });
  const testTeamIds = testTeams.map(t => t._id);
  
  console.log(`Found ${testTeams.length} test teams to delete.`);
  
  // --- EXECUTE DELETIONS ---
  
  await CaptainRequest.deleteMany({ playerId: { $in: testPlayerIds } });
  await CaptainRequest.deleteMany({ tournamentId: { $in: testTournamentIds } });
  console.log('Deleted orphaned Captain Requests.');
  
  await TeamMembership.deleteMany({ playerId: { $in: testPlayerIds } });
  await TeamMembership.deleteMany({ teamId: { $in: testTeamIds } });
  await TeamMembership.deleteMany({ tournamentId: { $in: testTournamentIds } });
  console.log('Deleted orphaned Team Memberships.');
  
  await Team.deleteMany({ _id: { $in: testTeamIds } });
  console.log('Deleted test Teams.');
  
  await Tournament.deleteMany({ _id: { $in: testTournamentIds } });
  console.log('Deleted test Tournaments.');
  
  await Player.deleteMany({ _id: { $in: testPlayerIds } });
  console.log('Deleted test Players.');
  
  await User.deleteMany({ _id: { $in: testUserIds } });
  console.log('Deleted test Users.');
  
  console.log('--- CLEANUP COMPLETE ---');
  process.exit(0);
}

cleanup();
