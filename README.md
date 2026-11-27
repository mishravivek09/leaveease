# LeaveEase : Leave Management System (IGNOU MCSP-232)

> **Copyright © 2026 Vivek Mishra (`bytecode.vivek@gmail.com`)**  
> Developed for the **IGNOU MCAOL Project (MCSP-232)**. See [LICENSE](./LICENSE).

A full-stack Leave Management System built on the **MERN stack (MongoDB, Express.js, React, Node.js)** with strict 1:1 parity across all eight Section 10 MongoDB collections (`Employee`, `Department`, `Role`, `LeaveType`, `LeaveApplication`, `LeaveBalance`, `Notification`, `Holiday`), configurable single-level and multi-level (`Manager -> HR`) approval workflows, holiday-aware working-day calculation, automated balance accounting, local email/in-app notifications, and PDF/CSV MIS reporting.

---

## Key Features

- **1:1 Section 10 Schema Parity:** `Employee`, `Department`, `Role`, `LeaveType`, `LeaveApplication`, `LeaveBalance`, `Notification`, and `Holiday`.
- **Configurable Approval Workflows:** Per-department `single` (`Employee -> Manager/HR`) or `multi` (`Employee -> Manager -> HR`) routing with immutable `auditTrail` logs.
- **Holiday-Aware Working-Day Engine:** Server-side UTC calculation excluding configurable department weekly-offs and mandatory public holidays.
- **Automated Leave Balance & Carry-Forward:** Pre-submit overlap & pending-encumbrance validation, atomic deduction on final approval, and idempotent year-end carry-forward.
- **Email & In-App Notifications:** Local Mailpit SMTP integration (with offline console fallback) and an in-app notification bell.
- **MIS Reporting & Export:** 5 synopsis reports (Employee Leave History, Department-wise Utilisation, Leave Register, Pending Approvals, Leave Balance Summary) exportable as **CSV** and **PDF**.
- **Security Hardening:** `bcryptjs` hashing, JWT authentication with `/api/auth/me` hydration, forced first-login password change, `helmet`, rate limiting, and role-scoped RBAC.

---

## Quick Start with Docker Compose (Recommended)

Run MongoDB, Mailpit (local email server), Backend API (auto-seeded on first start), and Frontend in one command:

```bash
docker compose up --build
```

### Service URLs & Container Credentials

| Service | URL / Connection | Credentials / Notes |
| --- | --- | --- |
| **Frontend App (Nginx + React)** | `http://localhost:3000` | Proxies `/api/` to `backend:5000` |
| **Backend API (Express 5)** | `http://localhost:5000` | Auto-seeds default data if DB is empty |
| **Mailpit Web Inbox** | `http://localhost:18025` | Captures all outgoing emails (`mailpit:1025`, host `11025`) |
| **MongoDB 7** | `mongodb://lms_admin:lms_password@localhost:27017/leave_management_system?authSource=admin` | Root user: `lms_admin` / `lms_password` |

---

## Default Seeded Demo Accounts

All seeded accounts use the default password: **`Demo@1234`**

| Name | Email | Role | Department | Workflow Mode |
| --- | --- | --- | --- | --- |
| **Asha Admin** | `admin@leaveease.local` | `Admin` | Operations | `single` |
| **Harish HR** | `hr@leaveease.local` | `HR` | Engineering | `multi` (HR Approver) |
| **Meera Manager** | `manager@leaveease.local` | `Manager` | Engineering | `multi` |
| **Omkar OpsManager** | `ops.manager@leaveease.local` | `Manager` | Operations | `single` |
| **Vivek Mishra** | `employee@leaveease.local` | `Employee` | Engineering | `multi` (`Manager -> HR`) |
| **Riya Operations** | `ops.employee@leaveease.local` | `Employee` | Operations | `single` (`Manager`) |

### Default Seeded Master Data
- **Roles:** `Employee`, `Manager`, `HR`, `Admin`
- **Departments:** `Engineering` (`multi` approval, Sat/Sun off), `Operations` (`single` approval, Sat/Sun off)
- **Leave Types:** `Casual` (12 days/yr), `Earned` (15 days/yr, carry-forward up to 10 days), `Sick` (10 days/yr), `Maternity` (90 days/yr)
- **Holidays:** Republic Day (`01-26`), Independence Day (`08-15`), Gandhi Jayanti (`10-02`), Christmas Day (`12-25`)

---

## Local Development Setup (Without Docker)

### 1. Backend
```bash
cd server
npm install
cp .env.example .env   # Configure MONGO_URI and JWT_SECRET
npm run seed           # Reset & seed all 8 collections
npm run dev            # Start Express server on port 5000
```

### 2. Frontend
```bash
cd client
npm install
npm run dev            # Start Vite dev server on port 5173
```

---

## Verification & Testing

```bash
# Server unit tests (working-day calculation, CSV & PDF generation)
npm --prefix server test

# Client production build & ESLint
npm --prefix client run build
npm --prefix client run lint
```

---

## Author & Copyright

**Vivek Mishra**  
Email: `bytecode.vivek@gmail.com`  
Project: IGNOU MCSP-232 : Leave Management System  
Copyright © 2026 Vivek Mishra. All rights reserved.
