const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CaptainRequest = require('../models/CaptainRequest');
const Player = require('../models/Player');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const connectDB = require('../config/db');

dotenv.config();

async function fixCaptains() {
  await connectDB();
  
  const approvedRequests = await CaptainRequest.find({ status: 'approved' });
  console.log(`Found ${approvedRequests.length} approved requests.`);
  
  for (const request of approvedRequests) {
    const player = await Player.findById(request.playerId);
    if (!player) continue;

    let team = await Team.findOne({ tournamentId: request.tournamentId, name: player.departmentName });
    
    if (!team) {
       team = await Team.create({
          name: player.departmentName,
          tournamentId: request.tournamentId,
          captainId: player._id
       });
       console.log(`Created team ${team.name}`);
    } else {
       if (!team.captainId) {
           team.captainId = player._id;
           await team.save();
           console.log(`Assigned captain to team ${team.name}`);
       }
    }
    
    player.isCaptain = true;
    await player.save();
    
    const existingMembership = await TeamMembership.findOne({ tournamentId: request.tournamentId, playerId: player._id });
    if (!existingMembership) {
        await TeamMembership.create({
            playerId: player._id,
            teamId: team._id,
            tournamentId: request.tournamentId
        });
        console.log(`Created membership for ${player.name}`);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

fixCaptains();
