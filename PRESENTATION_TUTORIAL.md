# Accident Response System Presentation Tutorial

This guide is for a student who needs to present the application to a teacher.
It explains:

- what the project does
- how to start all services
- which screens exist for each user
- how to demo the main flows
- what to say during the presentation

## 1. Project Overview

This application is an accident response management system.

Its purpose is to:

- detect or emulate accident events
- alert citizens and ask for a safety response
- dispatch ambulance providers when help is needed
- allow admin and super admin to manage incidents
- support real-time citizen to admin chat during emergencies
- support image-based AI analysis for accident emulation

There are 4 main user roles:

- `Citizen`
- `Ambulance Provider`
- `Admin`
- `Super Admin`

There is also an `AI Service` used for accident image analysis.

## 2. System Architecture

This project has 3 running services:

1. `frontend`
- React application
- runs on `http://localhost:3000`

2. `backend`
- Express + MongoDB + Socket.IO
- runs on `http://localhost:3001`

3. `ai`
- FastAPI service for accident image analysis
- runs on `http://127.0.0.1:8000`

## 3. Folder Structure

- `frontend/` : React UI
- `backend/` : Express API, auth, dispatch, database logic
- `ai/` : Python FastAPI image-analysis service

## 4. Before Starting

Make sure these are available on the machine:

- Node.js
- npm
- Python 3
- MongoDB connection already configured in `backend/.env`

Current backend environment already includes:

- MongoDB connection
- backend port `3001`

If needed later, you can also add:

- `AI_SERVICE_URL=http://127.0.0.1:8000`
- `OPENAI_API_KEY=...` inside the `ai` environment if you want OpenAI vision analysis

Without `OPENAI_API_KEY`, the AI service still works using a local fallback analyzer.

## 5. How To Start All Services

Open 3 terminals.

### Terminal 1: Start AI Service

```bash
cd /Users/rahul/Documents/Work/AccidentGroup3/ai
source .venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Expected:

- AI service available at `http://127.0.0.1:8000`
- Health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"success":true,"status":"ok","provider":"heuristic-vision"}
```

### Terminal 2: Start Backend

```bash
cd /Users/rahul/Documents/Work/AccidentGroup3/backend
npm install
npm run dev
```

Expected:

- backend runs on `http://localhost:3001`

Health check:

```bash
curl http://localhost:3001/api/health
```

### Terminal 3: Start Frontend

```bash
cd /Users/rahul/Documents/Work/AccidentGroup3/frontend
npm install
npm start
```

Expected:

- frontend opens on `http://localhost:3000`

## 6. Demo Accounts

You can either:

- register new accounts from the UI
- or use already-created test accounts if available in the database

Recommended accounts for the demo:

1. Citizen account
2. Ambulance provider account
3. Admin account
4. Super admin account

## 7. Login and Registration Flow

### Login Screen

Features:

- email input
- password input
- `Forgot Password`
- `Create account`

Demo points:

- login redirects based on role
- forgot password resets the backend password to `123`

### Registration Screen

Features:

- name
- email
- phone
- password
- role selection:
  - `Citizen`
  - `Ambulance Provider`

## 8. Citizen Screens and Features

Path after login:

- `/citizen`

### Citizen Dashboard Main Tabs

- `Home`
- `Alerts`
- `History`
- `Profile`

### Citizen Home

Features:

- safety summary card
- unread alert count
- response count
- SOS button
- quick actions

What to say:

- This is the main emergency dashboard for a citizen.
- It shows active safety information and gives quick access to SOS.

### Citizen Alerts

Features:

- live accident notifications
- system messages
- open support chat
- mark read

What to say:

- When an accident event is triggered, the citizen receives live alerts here.

### Citizen History

Features:

- past incident cards
- user response shown
- accident status shown
- location details
- open support chat from history

### Citizen Profile

Features:

- name
- email
- phone
- emergency contact
- blood group

### Citizen Safety Popup

When an accident event or emulation reaches the citizen:

- popup appears
- alarm sound plays
- user is asked:
  - `I'm Safe`
  - `Need Help`

If user clicks `Need Help`:

- emergency response is submitted
- support chat opens

If user does not respond before timeout:

- timeout action happens
- emergency dispatch is triggered
- support chat opens automatically

### Citizen Emergency Support Chat

Features:

- real-time chat with admin
- manual text message input
- voice-to-text input
- hardcoded quick emergency phrases
- location shortcut:
  - `My location is - current location`
- visible `Close` button

Suggested demo messages:

- `I'm hit bad`
- `I'm safe but need help`
- `Ambulance has not reached yet`

## 9. Ambulance Provider Screens and Features

Path after login:

- `/ambulance`

### Ambulance Setup

If the provider has no ambulance profile yet:

- driver name
- vehicle number
- latitude
- longitude
- register ambulance unit

What to say:

- Ambulance user role and ambulance profile are separate.
- The provider must register the ambulance unit before full operations.

### Ambulance Dashboard

Main sections:

- `Overview`
- `Unit Profile`
- `Dispatches`

### Overview

Features:

- unit status
- verification status
- total dispatches
- assigned count
- accepted count
- completed count

### Unit Profile

Features:

- driver info
- vehicle number
- verification status
- availability status
- change status:
  - `Available`
  - `Busy`
  - `Offline`
- update location

Important dispatch rule:

The ambulance receives dispatch only if:

- `verificationStatus = Approved`
- `availabilityStatus = Available`

### Dispatches

Features:

- assigned dispatch requests
- severity info
- address/location if available
- actions:
  - `Accept`
  - `Reject`
  - `Complete`

## 10. Admin Screens and Features

Path after login:

- `/admin`

Main admin sections:

- `Overview`
- `Emulations`
- `Accident History`
- `Dispatch Logs`
- `Users`
- `Chat History`

### Admin Overview

Features:

- total users
- citizens
- ambulance providers
- total accidents
- pending accidents
- active dispatches
- no response count
- pending emulations

### Admin Emulations

This is one of the most important demo areas.

Features:

- manual accident emulation form
- image upload for AI analysis
- `Analyze Image`
- AI result card:
  - provider
  - suggested severity
  - confidence
  - summary
- submit emulation
- emulation history

What to say:

- Admin can simulate accident events without a real road accident.
- The optional image upload can help estimate severity before the emulation is submitted.

### Admin AI Image Analysis

Flow:

1. Upload an accident image
2. Click `Analyze Image`
3. Backend sends the image to the Python `ai` service
4. AI service returns structured JSON
5. Severity and confidence are prefilled in the form
6. Admin submits the emulation

If OpenAI is not configured:

- the system uses `heuristic-vision`
- this is a fallback local visual estimator

### Admin Accident History

Features:

- accident list
- status
- location
- dispatch status
- `Dispatch`
- `Cancel`

What to say:

- Admin can manually trigger ambulance dispatch from accident history.
- If no ambulance is available, dispatch becomes `Pending`.

### Admin Dispatch Logs

Features:

- assigned time
- status
- ambulance vehicle
- reason

### Admin Users

Features:

- user list
- role management
- ambulance verification controls

For ambulance-role users:

- verification status
- availability status
- vehicle number
- `Approve Ambulance`
- `Reject Ambulance`

### Admin Citizen Support Chat

This is the real-time emergency conversation screen.

Features:

- left side: conversation list
- right side: selected thread
- latest conversation shown at top
- click a citizen to open the thread
- admin can reply in real time

What to say:

- This allows direct emergency communication between citizen and admin during an active incident.

## 11. Super Admin Screens and Features

Path after login:

- `/super-admin`

Super admin has everything admin has, plus:

- `Approvals`
- `Settings`

### Super Admin Approvals

Features:

- pending emulations
- approve or reject emulations

### Super Admin Settings

Features:

- configure safety response timeout in seconds

What to say:

- This timeout controls how long the citizen has to respond before the system auto-escalates.

## 12. Real-Time Features

The project uses Socket.IO for real-time behavior.

Real-time events include:

- new accident alerts
- dispatch updates
- citizen safety prompt trigger
- timeout escalation
- admin-citizen support chat messages

What to say:

- The system is not only form-based. It reacts live when incidents happen.

## 13. Suggested Presentation Flow

This is a clean sequence for the live demo:

### Part 1: Introduction

Say:

- This project is an accident response management platform with citizen alerts, ambulance dispatch, admin control, and AI-assisted accident emulation.

### Part 2: Show Registration and Login

Show:

- registration screen
- login screen
- forgot password

### Part 3: Citizen Experience

Show:

- citizen dashboard
- alerts
- history
- profile

Explain:

- a citizen receives an alert and must confirm safety

### Part 4: Admin Accident Emulation

Show:

- admin dashboard
- emulation section
- image upload
- analyze image
- submit emulation

Explain:

- emulation allows testing the system without a real accident

### Part 5: Citizen Safety Popup

After emulation:

- citizen sees popup
- alarm plays
- choose `Need Help`

### Part 6: Citizen Support Chat

Show:

- chat opens
- quick messages
- voice-to-text
- location shortcut

### Part 7: Admin Support Chat

Show:

- admin chat history section
- select citizen
- send reply
- show real-time update on citizen screen

### Part 8: Ambulance Flow

Show:

- ambulance login
- dashboard
- availability status
- dispatches

Explain:

- only approved and available ambulances receive assignments

### Part 9: Admin Dispatch Control

Show:

- accident history
- dispatch
- dispatch logs

### Part 10: Super Admin

Show:

- approvals
- settings

Explain:

- super admin manages approval and timing rules

## 14. Key Technical Points To Mention

You can mention these during the presentation:

- `React` frontend
- `Express` backend
- `MongoDB` database
- `Socket.IO` for real-time communication
- separate `FastAPI` AI service in Python
- role-based authentication
- real-time support chat
- AI-assisted image analysis for accident emulation

## 15. Important Notes For Teacher Questions

### Q: Is the AI model fully trained?

Answer:

- The system is already integrated with a separate AI service.
- Right now it supports a fallback local analyzer and can also connect to a stronger vision model.
- The architecture is ready for replacing the fallback with a trained accident classifier later.

### Q: Is the dispatch automatic?

Answer:

- It can be triggered from user help response, timeout escalation, or manual admin dispatch.

### Q: What makes an ambulance eligible?

Answer:

- It must be approved by admin and set to available.

### Q: Is the chat real-time?

Answer:

- Yes, it uses Socket.IO and updates both citizen and admin live.

## 16. Troubleshooting

### Frontend is not reflecting latest change

Do:

- hard refresh browser

### Backend changes not visible

Do:

- restart backend

### AI image analysis not working

Check:

- AI service is running on `127.0.0.1:8000`
- backend is restarted
- uploaded file is a valid image

### Ambulance is not getting dispatch

Check:

- ambulance profile exists
- verification is `Approved`
- availability is `Available`

## 17. Quick Command Summary

### Start AI

```bash
cd /Users/rahul/Documents/Work/AccidentGroup3/ai
source .venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Start Backend

```bash
cd /Users/rahul/Documents/Work/AccidentGroup3/backend
npm run dev
```

### Start Frontend

```bash
cd /Users/rahul/Documents/Work/AccidentGroup3/frontend
npm start
```

## 18. Final Presentation Closing Line

Suggested ending:

"This system demonstrates how accident detection, citizen safety confirmation, ambulance dispatch, admin coordination, AI-assisted image analysis, and real-time emergency chat can be combined into one integrated response platform."
