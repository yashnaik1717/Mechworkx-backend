# 🚀 MechWorkx Unified Backend API Guide

This backend is a unified version supporting both Flutter Mobile and Web platforms. It is network-aware and supports direct Supabase storage.

## 🔑 Authentication (`/auth`)
*All users must verify via OTP before they can access protected routes.*

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| POST | `/auth/signup` | Register a new user | `name`, `trade_name`, `email`, `phone`, `user_type` (customer/vendor/both) |
| POST | `/auth/verify-otp` | Verify OTP and get JWT Token | `phone`, `otp` |
| POST | `/auth/login` | Request login OTP | `phone` |

---

## 👤 Profile Management (`/api/profile`)
*Requires Authentication Header: `Authorization: Bearer <TOKEN>`*

| Method | Endpoint | Description | Body / Files |
| :--- | :--- | :--- | :--- |
| GET | `/api/profile/me` | Get current user's profile | - |
| PUT | `/api/profile/update` | Update profile info | `name`, `trade_name`, `email` |
| POST | `/api/profile/photo` | Upload profile photo (Supabase) | `file` (Multipart) |

---

## 🛠️ Jobs (`/api/jobs`)
*Includes dual-platform support (Web flow & Flutter 5-step flow).*

| Method | Endpoint | Platform | Description | Body / Files |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/jobs/send-otp` | Both | Send OTP for job creation | - |
| POST | `/api/jobs/create` | Web | Create job (one-shot) | `title`, `description`, `otp`, etc. + Files |
| POST | `/api/jobs/verify-otp-submit`| Flutter | Create job (aliased) | Full 18+ fields (address, city, etc.) + `files` |
| GET | `/api/jobs/my-jobs` | Both | List customer's jobs | Query: `status` (all/open/active/completed) |
| GET | `/api/jobs/ongoing` | Flutter | List active/open jobs | - |
| GET | `/api/jobs/available` | Vendor | List jobs open for bidding | - |
| GET | `/api/jobs/:jobId` | Both | Get single job details | - |
| PUT | `/api/jobs/:jobId` | Both | Edit an open job | `title`, `description`, `otp`, etc. |
| DELETE| `/api/jobs/:jobId` | Both | Delete a job | - |
| GET | `/api/jobs/categories` | Both | List all job categories | - |
| GET | `/api/jobs/job-works/:cid` | Both | List works for category | - |

---

## 📈 Bids (`/api/bids`)
*Requires Vendor/Both role for submitting bids.*

| Method | Endpoint | Description | Body |
| :--- | :--- | :--- | :--- |
| POST | `/api/bids/:jobId` | Submit a bid for a job | `bid_amount`, `proposal` |
| GET | `/api/bids/job/:jobId` | Customer: See all bids for a job | - |
| POST | `/api/bids/:bidId/award` | Customer: Award job to a vendor | - |

---

## 📅 Progress Tracking (`/api/progress`)
*Used by vendors to update job status and upload documents.*

| Method | Endpoint | Description | Body / Files |
| :--- | :--- | :--- | :--- |
| POST | `/:jobId/accept` | Vendor: Accept awarded job | - |
| POST | `/:jobId/update` | Vendor: Update % and upload sheet| `status_percent`, `notes`, `file` (Multipart) |
| POST | `/:jobId/shipment` | Vendor: Update shipment status | `shipment_status`, `file` (Multipart) |

---

## 🖥️ Server Setup & Testing

1. **Install Dependencies**: `npm install`
2. **Setup Environment**: Copy `.env` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DB_PASSWORD`, and `JWT_SECRET`.
3. **Run Server**: `npm run dev`

### 📱 Network Testing
The server listens on `0.0.0.0`. When you start it, check the terminal for the **Network URL** (e.g., `http://192.168.1.10:5000`). Use this URL in your Flutter code or Postman to test across devices on the same WiFi.