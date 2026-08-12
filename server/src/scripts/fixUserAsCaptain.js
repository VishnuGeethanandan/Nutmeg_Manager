const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Player = require('../models/Player');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const connectDB = require('../config/db');

dotenv.config();

async function fixUserAsCaptain() {
  await connectDB();
  
  const vishnu = await Player.findOne({ name: 'Vishnu G' });
  const mcaTeam = await Team.findOne({ name: 'MCA' });
  
  if (vishnu && mcaTeam) {
     // Demote current captain if there is one
     if (mcaTeam.captainId) {
         const oldCaptain = await Player.findById(mcaTeam.captainId);
         if (oldCaptain) {
            oldCaptain.isCaptain = false;
            await oldCaptain.save();
         }
     }
     
     // Set Vishnu as the true captain
     mcaTeam.captainId = vishnu._id;
     await mcaTeam.save();
     
     vishnu.isCaptain = true;
     await vishnu.save();
     
     // Make sure Vishnu is in the team membership
     const membership = await TeamMembership.findOne({ teamId: mcaTeam._id, playerId: vishnu._id });
     if (!membership) {
        await TeamMembership.create({
            teamId: mcaTeam._id,
            playerId: vishnu._id,
            tournamentId: mcaTeam.tournamentId
        });
     }
     
     console.log('Successfully set Vishnu G as the captain of MCA Team.');
  }
  
  process.exit(0);
}
fixUserAsCaptain();
