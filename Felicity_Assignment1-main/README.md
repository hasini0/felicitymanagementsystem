# Felicity — Event Management System


**Live Frontend:** https://felicity-assignment1.vercel.app/  
**Backend API:** https://felicity-assignment1.onrender.com

---

## Tech Stack & Justification

### Frontend
| Library | Version | Why |
|---|---|---|
| **React** | 18 | Component-driven UI; hooks make state management clean for complex forms and real-time updates |
| **React Router DOM** | 6 | Declarative client-side routing with nested routes and protected paths |
| **Tailwind CSS** | 3 | Utility-first CSS eliminates context-switching; dark theme and responsive grid trivially easy |
| **Axios** | 1.6 | Promise-based HTTP with interceptors for automatic JWT header injection |
| **socket.io-client** | 4.6 | WebSocket client for team chat; matches the socket.io server |
| **React Hot Toast** | 2.4 | Lightweight non-blocking notifications; better UX than `alert()` |
| **date-fns** | 2.30 | Tree-shakeable date formatting; far smaller than moment.js |
| **React Icons** | 4.12 | Single import for Feather/Font Awesome icons without full icon font overhead |
| **html5-qrcode** | 2.3 | Browser-native QR scanning using camera; no native app required |
| **@headlessui/react** | 1.7 | Unstyled accessible UI primitives (modals, transitions) that work with Tailwind |
| **@hcaptcha/react-hcaptcha** | 2 | Drop-in CAPTCHA widget; GDPR-friendlier than reCAPTCHA |

### Backend
| Library | Version | Why |
|---|---|---|
| **Express** | 4 | Minimal, well-understood HTTP framework; middleware model fits auth/validation pipeline |
| **Mongoose** | 8 | Schema validation + rich query API on top of MongoDB; subdocuments model registrations naturally |
| **jsonwebtoken** | 9 | Stateless JWT auth; no session store needed for horizontal scaling |
| **bcrypt** | 5 | Battle-tested password hashing; async API keeps event loop unblocked |
| **express-validator** | 7 | Declarative input validation middleware; keeps route handlers clean |
| **axios** | 1.6 | Used server-side to call hCaptcha verify and Discord webhook APIs |
| **socket.io** | 4.6 | WebSocket abstraction with automatic fallback; used for team event chat |
| **qrcode** | 1.5 | Generates QR code data URLs server-side at registration time; no client dependency |
| **nodemailer** | 6.9 | Sends password-reset emails; transport-agnostic so SMTP provider is swappable |
| **multer** | 2 | Handles multipart file uploads (payment proof, event image) |
| **validator** | 13 | Extra string validation (email format, URL checks) beyond express-validator |
| **cors** | 2 | Fine-grained CORS policy for Vercel → Render cross-origin requests |
| **dotenv** | 16 | Twelve-factor app config; keeps secrets out of source |


---

## Advanced Features

### Tier A — A1: Team Event Registration
- Participants can create or join a team for any team-enabled event
- Team leader sets a team name; others join via invite/accept flow
- Backend enforces `minTeamSize` / `maxTeamSize` per event
- Team status transitions: `PENDING → COMPLETE` when all seats filled
- QR code generated per team member; attendance tracked individually

**Design decision:** Teams stored in a separate `Team` collection (not embedded in Event) so member lookups and status updates don't require pulling the full event document.

### Tier A — A3: QR Scanner & Attendance Tracker
- Organizer opens `/organizer/events/:id/scanner` during the event window
- `html5-qrcode` accesses the device camera in the browser — no app install
- Each QR code encodes `{ ticketId, eventId, participantId }` as JSON
- On successful scan: participant's `registeredEvents.status → COMPLETED`, `paymentStatus → COMPLETED`, and `event.totalRevenue` is incremented by the participant's actual order value
- Duplicate scan detection prevents double-marking
- Manual attendance fallback for participants without phones
- Attendance rate shown live in EventManagement dashboard

**Design decision:** Revenue is updated on scan (not on registration) to ensure only attended/confirmed participants count toward revenue — more accurate for paid events.

### Tier B — B2: Organiser Password Reset Workflow
- Organizer submits a reset request with a reason from their profile page
- Request stored in `PasswordResetRequest` collection with `PENDING` status
- Admin dashboard lists all pending requests and can approve or reject with comments
- On approval: new random password generated, hashed, saved; email sent to organizer
- On rejection: rejection email sent with admin's reason
- Organizer can see their request history (PENDING / APPROVED / REJECTED)

**Design decision:** Admin-gated workflow (not self-service email link) because organizer accounts are created by admins and need the same trust model for password resets.

### Tier B — B3: Team Event Chat
- Real-time chat room per team event powered by **Socket.io**
- Messages scoped to `eventId` rooms so teams only see their own channel
- Participants authenticated via JWT before joining the socket room
- Messages displayed with sender name and timestamp

### Tier C — C3: Bot Protection (hCaptcha)
- `@hcaptcha/react-hcaptcha` widget on the participant registration form
- On submit, the captcha token is sent to the backend with the registration payload
- Backend calls `https://hcaptcha.com/siteverify` with the token and the server-side secret
- Registration is rejected if captcha verification fails
- Uses hCaptcha test keys locally; production keys set via environment variables

**Design decision:** Chose hCaptcha over reCAPTCHA v3 because it is GDPR-compliant by default and does not fingerprint users with invisible scoring.

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas connection string)

### 1. Clone & install
```bash
git clone https://github.com/flashstep11/Felicity_Assignment1
cd Felicity_Assignment1
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # or create .env manually
npm install
npm run dev            # starts on port 5000
```

**`backend/.env`**
```
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your_secret_here
JWT_EXPIRE=7d
NODE_ENV=development
ADMIN_EMAIL=admin@felicity.iiit.ac.in
ADMIN_PASSWORD=admin123
HCAPTCHA_SECRET=0x0000000000000000000000000000000000000000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start              # starts on port 3000
```

**`frontend/.env`**
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Seed admin account
The admin account is auto-created on first backend start using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

### 5. Create an organizer
Log in as admin → **Manage Organizers** → **Create Organizer** → credentials printed to backend console (or emailed in production).
