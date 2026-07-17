# TUK Smart ID System

A comprehensive, high-fidelity NFC-based access control and prepaid campus wallet system designed for the Technical University of Kenya (TUK). This system enables secure student identification, allowed facilities gate control, cash/online wallet deposits, and real-time live event streaming logs.

---

## Key Features

### 📡 Real-Time Verification Terminal
- **NFC ID Validation:** Validates card taps against student records instantly.
- **Allowed Facilities Management:** Admins can dynamically toggle student access rules (e.g., granting CS Lab or Engineering Lab gates) from the admin terminal.
- **Dynamic Glowing Feedback:** Visual breathing glows on checkouts (glowing green cleared border, glowing red denied border with active shake effects).

### 🕐 Real-Time SSE Live Feeds
- **Server-Sent Events (SSE):** Streams incoming scans and transactions onto the Security Terminal and POS cashier feed in real time without polling.
- **Auto-refreshed Metrics:** Live dashboards showing today's taps, denial rates, POS revenue, and active gates.

### 💳 Student Portal & Prepaid Wallet
- **Digital Smart Card Widget:** High-fidelity visual mockup displaying available balance, smart card chip graphic, student name, and registration details.
- **Self-Service Online Top-Up:** Securely top up wallet balances using simulated M-Pesa phone STK pushes or credit cards.
- **Student History Feed:** Check personal access records and prepaid balance debit/credit transaction histories.

### 🛒 Merchant Cashier POS Terminal
- **Cash Deductions:** Cashiers charge student accounts for university services (Student Cafeteria, Library Printing, Bookshop, Laundry).
- **Cash Deposits:** Cashiers load physical cash deposits to student wallets using registration numbers.

---

## Technology Stack

- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL (Render/Supabase compatible)
- **Security:** JWT Authentication tokens, bcryptjs password hashing (with automatic lazy migration from legacy SHA-512 hashes)
- **Real-Time Channel:** HTML5 Server-Sent Events (SSE)
- **Frontend:** HTML, Tailwind CSS, JavaScript (Outfit and Inter modern typography)

---

## Database Configuration

The PostgreSQL schema uses the following tables (refer to [schema.sql](file:///c:/xampp/htdocs/smart-id-system/schema.sql)):

1. **`students`**: Contains registration numbers, names, password hashes, programs, wallet balances, NFC UIDs, and allowed facilities.
2. **`admins`**: Stores administrative credentials for security terminal logins.
3. **`access_logs`**: Tracks campus gate access attempts (facility, status, timestamps).
4. **`transactions`**: Logs debit/credit actions (cafeteria, cashier desks, online top-ups).

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (based on the environment template):
```env
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=smart_id_system
DB_PORT=5432
DB_SSL=true
JWT_SECRET=your-jwt-signing-secret
```

### 3. Initialize PostgreSQL Schema
Run the database update script to create tables and seed default mock students:
```bash
node update_db.js
```

### 4. Start the Application
Start the Node.js server:
```bash
npm start
```
The server will start running on port `3000`. You can access the client terminals locally by opening:
- Landing Page & Login: `index.html`
- Student Dashboard: `student.html`
- Security Terminal: `admin.html`
- Merchant POS: `pos.html`

---

## API Endpoints

### Student & Card Authentication
* `POST /login` - Student login (returns JWT session token).
* `POST /admin/login` - Admin login (returns JWT session token).
* `POST /student/activate-card` - Self-service NFC card activation (links UID to profile after validating password).

### Allowed Facilities & Scans
* `POST /verify` - NFC verify scan (checks gate permissions and fee status, logs and broadcasts event).
* `GET /logs` - Retrieves the 10 most recent access logs (admin only).
* `GET /student/:reg_number` - Returns student details, logs, transactions, and gate list.

### Prepaid Transactions
* `POST /pay` - Charges wallet balance at a campus service point (admin only).
* `POST /topup` - Cashier cash wallet deposit (admin only).
* `POST /student/:reg_number/topup` - Student portal online payment checkouts.

### Event Streaming
* `GET /events` - Server-Sent Events subscription connection (broadcasts live `access_log` and `transaction` updates).