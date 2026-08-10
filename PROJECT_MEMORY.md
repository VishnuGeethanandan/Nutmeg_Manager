# PROJECT MEMORY: Nutmeg Manager

> **Single Source of Truth & Long-Term Project Memory**  
> *This document serves as the single source of truth and long-term project memory for the Nutmeg Manager application. It records project concepts, finalized requirements, business rules, database design, architectural decisions, development methodology, module status, completed work, pending work, testing status, and important decisions to ensure seamless continuity across development sessions.*

---

## 1. Project Overview

* **Project Name:** Nutmeg Manager
* **Domain:** Web-based Tournament Management & AI Match Prediction System
* **Context:** Nutmeg is an annual football tournament conducted by the Master of Computer Applications (MCA) Department at Rajiv Gandhi Institute of Technology (RIT), Pampady.
* **Venue:** All matches are played at the single college football ground.

### Main System Capabilities
* User Authentication & Role-Based Authorization
* Player & Spectator Registration
* Team & Captain Management (Admin Approval Workflow)
* Department-Restricted Direct Player Selection
* Tournament Management (Creation, Status, History)
* Random Group Allocation Draw & Draw Locking
* Automatic Group Fixture & Knockout Pairing Generation
* Match Result & Detailed Event Management (Goals, Assists, Own Goals, Yellow/Red Cards, Extra Time, Penalties)
* Dynamic Standings Table & Multi-Tier Qualification Logic
* Player Statistics (Isolated Per Tournament)
* Announcements Broadcast System
* AI-Based Match Outcome Prediction using Historical Nutmeg Data

---

## 2. Finalized Requirements

1. **Multi-Role Authentication:** Support `admin`, `player`, and `spectator` roles with JWT security.
2. **Player Identity:** Globally unique admission number per player. One permanent player profile linked to a single user account across multiple tournaments.
3. **Spectator Registration:** Basic user registration without requiring football or player details.
4. **Team & Captain System:** Captains are normal players with admin-approved status. Admin approves/rejects captain requests (`isCaptain = true`, `team.captainId = player._id`). Exactly one approved captain per team.
5. **Direct Player Selection:** Captains directly select eligible players from their own department. No invitation/acceptance process. Enforced on the backend.
6. **Squad Limits:** Minimum 9 players, maximum 15 players per team (including the captain).
7. **Tournament Format:** 8 teams, 2 groups (Group A & Group B, 4 teams each). 12 total group-stage matches (single round-robin, 3 matches/team).
8. **Knockout Stage:** Top 2 teams from each group qualify for semi-finals (`A1 vs B2`, `B1 vs A2`). Winners play in the final. Extra time and penalty shootouts for knockouts.
9. **Automatic Fixture Generator:** System generates 12 group stage fixtures automatically upon draw confirmation. Admin manually sets match date/time. Knockout pairings auto-populate as match results are entered.
10. **Standings & Tie-Breakers:** Points (Win=3, Draw=1, Loss=0). Tie-breakers: 1. Head-to-Head (mini head-to-head table for 3+ tied teams), 2. Most Goals Scored, 3. Fewer Cards (`Yellow Cards + Red Cards`). Only completed matches affect standings.
11. **Match Event Tracking:** Track Goals, Assists, Own Goals, Yellow Cards, Red Cards, Minute of Event, Extra Time, and Penalties. Penalty shootout scores are stored separately from actual match scores. Own goals credit the opponent team's score.
12. **Historical Data Isolation:** Player statistics are stored separately per tournament (`playerTournamentStats`) and never overwritten.
13. **Announcements:** Tournament-specific announcements created, published, edited, or deleted by Admins.
14. **AI Outcome Prediction:** Dedicated AI service predicting Team 1 Win, Draw, Team 2 Win probabilities and outcome based on historical Nutmeg tournament data. Predictions are stored separately in `predictions`.

---

## 3. Business Rules

| Category | Rule | Enforcement Level |
| :--- | :--- | :--- |
| **Admission Number** | Globally unique per player profile across the system. | Database Index & Backend API |
| **Department Lock** | Player's department cannot be changed by the player to become eligible for another team. | Backend API |
| **Player Exclusivity** | A player can belong to only one team per tournament. | Backend API & Database |
| **Squad Bounds** | Squad must have min 9 and max 15 players (including captain). | Backend API |
| **Captain Status** | Captain is a regular player (`isCaptain = true`). Approved strictly by Admin. | Backend API & Workflow |
| **Captain Exclusivity**| Only one approved captain per team at any time. | Backend API & Database |
| **Player Selection** | Direct selection by captain. Only players in the same department who are unassigned. | **Strict Backend API Enforcement** |
| **Group Allocation** | 8 teams randomly split into Group A (4) and Group B (4). Locked upon admin confirmation. | Backend API |
| **Standings Calculation**| Win=3, Draw=1, Loss=0. Only completed matches count. Tie-breakers: H2H (mini-table if >2 tied) → Goals Scored → Fewer Cards. | Backend Calculation Engine |
| **Penalty Scores** | Penalty shootout goals stored separately in `team1Penalties`/`team2Penalties` and NOT added to regular score. | Backend & Database |
| **Own Goals** | Credited to player in `matchEvents` (`eventType: 'own_goal'`). Increments opposing team score, NOT player's goal count. | Backend Event Processor |
| **Data Preservation**| Historical tournament statistics per player are preserved in `playerTournamentStats` and never overwritten. | Database Schemas |
| **AI Predictions** | AI output stored in `predictions` collection linked via `matchId`. Actual match scores remain separate. | Backend & AI API |

---

## 4. Database Design (Finalized Mongoose Schemas)

The database consists of **11 conceptual collections**:

### 1. `users`
Authentication credentials and account role.
```text
_id           : ObjectId
name          : String (Required)
email         : String (Required, Unique, Lowercase)
passwordHash  : String (Required)
phoneNumber   : String
role          : Enum ['admin', 'player', 'spectator'] (Default: 'spectator')
createdAt     : Date
updatedAt     : Date
```

### 2. `players`
Permanent player identity linked to user account.
```text
_id             : ObjectId
userId          : ObjectId (Ref: 'users', Required, Unique)
name            : String (Required)
admissionNumber : String (Required, Unique)
departmentName  : String (Required)
phoneNumber     : String
position        : String (Required)
jerseyNumber    : Number
photo           : String
teamId          : ObjectId (Ref: 'teams', Nullable)
isCaptain       : Boolean (Default: false)
createdAt       : Date
updatedAt       : Date
```

### 3. `teams`
Permanent team entity per department.
```text
_id             : ObjectId
teamName        : String (Required, Unique)
departmentName  : String (Required)
captainId       : ObjectId (Ref: 'players', Nullable)
logo            : String
createdAt       : Date
updatedAt       : Date
```

### 4. `captainRequests`
Workflow tracking player captaincy requests.
```text
_id         : ObjectId
playerId    : ObjectId (Ref: 'players', Required)
teamId      : ObjectId (Ref: 'teams', Required)
status      : Enum ['pending', 'approved', 'rejected'] (Default: 'pending')
reviewedBy  : ObjectId (Ref: 'users', Nullable)
reviewedAt  : Date (Nullable)
createdAt   : Date
updatedAt   : Date
```

### 5. `tournaments`
Tournament meta configuration.
```text
_id             : ObjectId
name            : String (Required)
year            : Number (Required)
venue           : String (Default: 'RIT Football Ground')
startDate       : Date
endDate         : Date
status          : Enum ['upcoming', 'ongoing', 'completed'] (Default: 'upcoming')
groupDrawStatus : Enum ['pending', 'confirmed'] (Default: 'pending')
drawCompletedAt : Date (Nullable)
drawConfirmedBy : ObjectId (Ref: 'users', Nullable)
createdAt       : Date
updatedAt       : Date
```

### 6. `tournamentTeams`
Linking teams to tournaments with group assignment.
```text
_id                 : ObjectId
tournamentId        : ObjectId (Ref: 'tournaments', Required)
teamId              : ObjectId (Ref: 'teams', Required)
group               : Enum ['A', 'B'] (Nullable prior to draw)
registrationStatus  : Enum ['pending', 'approved', 'rejected'] (Default: 'approved')
groupAssignedAt     : Date (Nullable)
createdAt           : Date
```

### 7. `matches`
Stores all tournament match details and outcomes.
```text
_id              : ObjectId
tournamentId     : ObjectId (Ref: 'tournaments', Required)
matchNumber      : Number (Required)
stage            : Enum ['group', 'semi_final', 'final'] (Required)
group            : Enum ['A', 'B'] (Nullable for knockouts)
team1Id          : ObjectId (Ref: 'teams', Required)
team2Id          : ObjectId (Ref: 'teams', Required)
date             : Date (Nullable)
time             : String (Nullable)
status           : Enum ['scheduled', 'ongoing', 'completed', 'postponed'] (Default: 'scheduled')
team1Score       : Number (Default: 0)
team2Score       : Number (Default: 0)
winnerId         : ObjectId (Ref: 'teams', Nullable)
extraTimePlayed  : Boolean (Default: false)
penaltyShootout  : Boolean (Default: false)
team1Penalties   : Number (Default: 0)
team2Penalties   : Number (Default: 0)
createdAt        : Date
updatedAt        : Date
```

### 8. `matchEvents`
Granular timeline events inside a match.
```text
_id        : ObjectId
matchId    : ObjectId (Ref: 'matches', Required)
playerId   : ObjectId (Ref: 'players', Required)
eventType  : Enum ['goal', 'assist', 'own_goal', 'yellow_card', 'red_card'] (Required)
minute     : Number (Required)
createdAt  : Date
```

### 9. `playerTournamentStats`
Isolated per-tournament player statistical performance.
```text
_id           : ObjectId
tournamentId  : ObjectId (Ref: 'tournaments', Required)
playerId      : ObjectId (Ref: 'players', Required)
matchesPlayed : Number (Default: 0)
goals         : Number (Default: 0)
assists       : Number (Default: 0)
ownGoals      : Number (Default: 0)
yellowCards   : Number (Default: 0)
redCards      : Number (Default: 0)
createdAt     : Date
updatedAt     : Date
```

### 10. `announcements`
Broadcasting news per tournament.
```text
_id           : ObjectId
tournamentId  : ObjectId (Ref: 'tournaments', Required)
title         : String (Required)
message       : String (Required)
createdBy     : ObjectId (Ref: 'users', Required)
isPublished   : Boolean (Default: false)
createdAt     : Date
updatedAt     : Date
```

### 11. `predictions`
AI-generated outcome predictions for scheduled matches.
```text
_id                  : ObjectId
matchId              : ObjectId (Ref: 'matches', Required, Unique)
team1WinProbability : Number (Required)
drawProbability      : Number (Required)
team2WinProbability : Number (Required)
predictedOutcome     : Enum ['team1_win', 'draw', 'team2_win'] (Required)
modelVersion         : String (Required)
createdAt            : Date
```

---

## 5. Architecture Decisions

1. **Vertical Slice Module Development:** Build feature-by-feature across Database -> Backend -> Frontend -> Integration -> Testing.
2. **Backend Security Enforcement:** All business rules (department locks, captain permissions, squad bounds, tie-breaking, role checks) are strictly enforced in the Backend APIs, not relying solely on frontend controls.
3. **Data Normalization & References:** Use Mongoose ObjectIds for relations (`userId`, `playerId`, `teamId`, `tournamentId`, `matchId`) to preserve data integrity and facilitate clean aggregation.
4. **Historical Isolation:** Use `playerTournamentStats` as a dedicated per-tournament collection to prevent stats from newer tournaments from overwriting historical records.
5. **Separate Penalty & Prediction Storage:** Keep penalty shootout scores out of regular match scores to maintain standard score analytics. Keep AI predictions in `predictions` to keep analytical outputs separate from actual scores.

---

## 6. Development Methodology

Development MUST follow a strict **VERTICAL SLICE (MODULE-BY-MODULE)** approach.

```text
       Module Selection
               ↓
    Database Requirements & Schema
               ↓
     Backend Implementation (API + Logic)
               ↓
     Frontend Implementation (UI + Forms)
               ↓
    Backend ↔ Frontend Integration
               ↓
     End-to-End Module Testing & Fixes
               ↓
     Mark Module Completed in Memory
               ↓
        Next Module
```

### Strict Rules:
* Do NOT complete the entire backend before starting the frontend.
* Do NOT build disconnected mock UI screens without working backend endpoints.
* A module is ONLY completed when Database + Backend + Frontend + Integration + Testing are fully validated.

---

## 7. Module Status

### Module 1 — Authentication & User Management
* **Status:** COMPLETED
* **Backend:** Completed (`User` model, `authController.js` with register/login/me/logout, JWT stored in HttpOnly cookies, password hashing with bcryptjs, role authorization middleware, seed admin script)
* **Frontend:** Completed (`AuthContext.jsx`, `api.js` with credentials, `RegisterPage.jsx` with Player/Spectator tabs, `LoginPage.jsx`, `ProtectedRoute.jsx`, role dashboards: `AdminDashboard`, `PlayerDashboard`, `SpectatorDashboard`)
* **Integration:** Completed (HttpOnly cookie authentication, session persistence, automatic auth check on mount, role-based client redirect)
* **Testing:** Completed (Automated end-to-end API test suite `testAuth.js` verifying 13 test assertions across registration, login, session validation, role protection, and logout)
* **Dependencies:** None
* **Remaining Work:** None

---

### Module 2 — Player Profile
* **Status:** NOT STARTED
* **Backend:** Not started (Player creation, Profile GET/PUT, Unique admission check, Dept lock check)
* **Frontend:** Not started (Player registration form, Profile view, Edit profile)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 1 (Auth)
* **Remaining Work:** Full module implementation & verification

---

### Module 3 — Team & Captain Management
* **Status:** NOT STARTED
* **Backend:** Not started (Team APIs, Captain request API, Admin approval/rejection API, 1-captain-per-team check)
* **Frontend:** Not started (Team overview, Captain request UI, Admin review dashboard)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 1 (Auth), Module 2 (Player Profile)
* **Remaining Work:** Full module implementation & verification

---

### Module 4 — Player Selection
* **Status:** NOT STARTED
* **Backend:** Not started (Eligible player query with same-dept lock & unassigned check, Min 9/Max 15 squad validation, Captain-only permission)
* **Frontend:** Not started (Available player list, Squad builder interface, Squad management UI)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 3 (Team & Captain)
* **Remaining Work:** Full module implementation & verification

---

### Module 5 — Tournament Management
* **Status:** NOT STARTED
* **Backend:** Not started (Tournament CRUD, Status transition API, Tournament team registration)
* **Frontend:** Not started (Admin tournament dashboard, Creation form, History page)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 1 (Auth), Module 3 (Teams)
* **Remaining Work:** Full module implementation & verification

---

### Module 6 — Random Group Draw
* **Status:** NOT STARTED
* **Backend:** Not started (8-team check, Random Group A (4) & B (4) assigner, Draw lock API)
* **Frontend:** Not started (Interactive/Animated draw interface, Group confirmation modal, Group view)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 5 (Tournament Management)
* **Remaining Work:** Full module implementation & verification

---

### Module 7 — Fixture Generation
* **Status:** NOT STARTED
* **Backend:** Not started (12 group matches auto-generator, Manual date/time scheduler API)
* **Frontend:** Not started (Fixture schedule list, Admin date/time entry UI, Match detail view)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 6 (Random Group Draw)
* **Remaining Work:** Full module implementation & verification

---

### Module 8 — Match Management
* **Status:** NOT STARTED
* **Backend:** Not started (Match result logger, Match events API: goals, assists, own goals, cards, extra time, penalties, winner calculator)
* **Frontend:** Not started (Admin live match logger UI, Event logger panel, Scoreboard display, Penalty shootout UI)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 7 (Fixture Generation)
* **Remaining Work:** Full module implementation & verification

---

### Module 9 — Standings & Qualification
* **Status:** NOT STARTED
* **Backend:** Not started (Points calculator, Head-to-Head & card tie-breaker engine, Auto semi-final & final generator)
* **Frontend:** Not started (Dynamic standings table, Qualification indicators, Knockout bracket visualizer)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 8 (Match Management)
* **Remaining Work:** Full module implementation & verification

---

### Module 10 — Player Statistics & Tournament History
* **Status:** NOT STARTED
* **Backend:** Not started (Stat aggregation engine per tournament, Player stat retrieval API, History API)
* **Frontend:** Not started (Player statistics page, Top scorers/assists leaderboards, Tournament archives)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 8 (Match Management), Module 9 (Standings)
* **Remaining Work:** Full module implementation & verification

---

### Module 11 — Announcements
* **Status:** NOT STARTED
* **Backend:** Not started (Announcement CRUD, Publish/Unpublish API, Tournament-scoped filter)
* **Frontend:** Not started (Admin announcement manager, Spectator/Player announcements ticker & page)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 1 (Auth), Module 5 (Tournament)
* **Remaining Work:** Full module implementation & verification

---

### Module 12 — AI Match Prediction
* **Status:** NOT STARTED
* **Backend:** Not started (Historical dataset extractor, Feature engineering pipeline, AI prediction API)
* **AI Model:** Not started (Model selection, training on Nutmeg dataset, evaluation)
* **Frontend:** Not started (Match win probability widget, Predicted outcome display)
* **Integration:** Not started
* **Testing:** Not started
* **Dependencies:** Module 8 (Match Management), Module 10 (Historical Data)
* **Remaining Work:** Full module implementation & verification

---

## 8. Completed Work

- [x] Project concept & domain specifications finalized
- [x] 8-team, 2-group tournament format & 12 group matches finalized
- [x] Knockout format (Semis: A1 vs B2, B1 vs A2, Final, Extra time, Penalty shootouts) finalized
- [x] Standings points & multi-tier tie-breaking rules (H2H mini table, Goals, Cards) finalized
- [x] Squad rules (9-15 players including captain) finalized
- [x] Permanent player identity (unique admission number, locked department) finalized
- [x] Captain request → Admin review → Approval workflow finalized
- [x] Direct captain player selection (same department, unassigned) finalized
- [x] User roles (`admin`, `player`, `spectator`) finalized
- [x] Master 11 MongoDB collection database schemas conceptually finalized
- [x] AI match prediction system concept & separate storage pattern finalized
- [x] Vertical slice module-by-module roadmap finalized
- [x] Single source of truth file (`PROJECT_MEMORY.md`) initialized
- [x] **Module 1 Completed:** Authentication & User Management (Database + Backend API + JWT HttpOnly Cookies + Role Middleware + Seed Script + React Auth Context + Login/Register UI + Role Dashboards + E2E Auth Test Suite)

---

## 9. Current Module

* **Module Name:** Ready to begin **Module 2 — Player Profile**
* **Current Status:** Module 1 (Authentication & User Management) Completed & Verified. Ready to implement Module 2.
* **Next Action:** Create `Player` Mongoose schema, implement Player Profile backend endpoints (Profile creation, GET/PUT profile, unique admission number check, locked department validation), build frontend Player Profile form and view components.

---

## 10. Pending Work

- [x] **Module 1:** Authentication & User Management (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 2:** Player Profile (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 3:** Team & Captain Management (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 4:** Player Selection (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 5:** Tournament Management (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 6:** Random Group Draw (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 7:** Fixture Generation (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 8:** Match Management (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 9:** Standings & Qualification (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 10:** Player Statistics & Tournament History (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 11:** Announcements (DB + Backend + Frontend + Integration + Testing)
- [ ] **Module 12:** AI Match Prediction (Data + ML Model + API + Frontend + Testing)

---

## 11. Known Issues

* None currently. Application code implementation has not yet started.

---

## 12. Testing Status

* **Unit Tests:** Password hash & validation logic tested
* **API End-to-End Tests:** Automated `testAuth.js` passing 13 assertions (Register, Login, Session `/me`, Cookie clear, Public Admin registration block)
* **UI Integration Tests:** Manual verification of AuthContext, glassmorphism form state, tab switching, and protected role-based routing
* **User Acceptance Verification:** Module 1 fully functional and verified end-to-end.

---

## 13. Important Decisions

1. **Single Source of Truth:** `PROJECT_MEMORY.md` is strictly maintained after completing every module to retain project decisions, schemas, and progress across sessions.
2. **Vertical Slice Execution:** Development will be executed module-by-module (DB → Backend → Frontend → Integration → Testing). No monolithic backend or frontend phases.
3. **Backend Department Locking:** Department eligibility for squad selection will be validated on the backend API layer to guarantee security.
4. **Separate Penalty & Prediction Data:** Penalty shootout scores will be stored separately from match scores to ensure accuracy in goal calculation. AI predictions will be stored separately in `predictions` collection.

---

## 14. Future Improvements

* Real-time WebSocket push updates for live scores and match event timeline during ongoing matches.
* Advanced statistical graphs (team performance trends, goal timelines).
* Exportable PDF reports for tournament summary, standings, and top scorer awards.
