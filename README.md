# Environmental Management Information System (EMIS)

## Overview

The **Environmental Management Information System (EMIS)** is a personal project developed to support the **City Environment and Natural Resources Office (CENRO)** of the **San Juan City Government**.

This system automates environmental processes, reduces manual paperwork, and improves record management for business establishments under environmental regulation.

EMIS was created and is currently maintained by a single developer and is still a work in progress.

---

## Purpose

This project was developed to:

- Automate the generation of Environmental Assessment Certificates
- Centralize and manage the database of business establishments
- Digitize and streamline the inspection, violation, and compliance workflow
- Assist the office in seminar coordination and documentation
- Improve accountability through audit trails
- Support internal communication via an internal chat tool
- Implement role-based access for system control and security

---

## Features

### Role-Based Access Control

The system uses **role-based users** with two main roles:

#### Admin

- Add, suspend, or reactivate employee accounts
- Approve and digitally sign Certificates of Participation

#### Regular Staff

- Manage assigned business establishment records
- Generate assessment certificates
- Encode and manage inspection reports, violations, and compliance records
- Send seminar invitations and certificates of participation
- Use the internal chat system

---

### System Modules

#### Business Directory

- Business establishment database management (Add / Update / Delete)
- Year-based records (2025–2030)
- Automatic sync of business data across future years
- Status tracking: High Risk / Low Risk, New / Renewal

#### Assessment Certificates

- Automated generation of Environmental Assessment Certificates (AEC)
- Printable PDF output per business record

#### Seminars

- Seminar invitation management
- Email sending for invitations and Certificates of Participation
- Certificate approval and digital signing workflow (Admin)

#### Inspection Reports

- Full 3-part inspection encoding:
  - **Part 1 — Notice of Inspection:** Business info (auto-filled from directory), inspection result (Passed / Violated / Notice-Warning), city ordinance violations with automatic fee computation and priority classification, DENR/environmental recommendations, compliance deadline
  - **Part 2 — Inspection Checklist:** Permits and certifications (Mayor's Permit, ECC, CNC, WDP, PTO, HWID), Pollution Control Officer details, solid waste / liquid waste / air pollution management assessments
  - **Part 3 — After Inspection Report:** Purpose, physical environment description, operation status, inspector observations, directives, after-inspection recommendations, assigned inspectors
- Auto-generated **Inspection ID** (format: `INSP-YYYY-NNN`, year-scoped sequential)
- **Reinspection support:** Create a reinspection from any existing report — all 3 parts are pre-filled from the original, with a new ID auto-generated and linked to the parent inspection chain
- **Inspection Timeline:** Full chain view (original + all reinspections) per business
- **Violation priority classification:**
  - `Priority` — any non-minor violation or non-minor DENR recommendation is present
  - `Low Priority` — only minor violations (failure to segregate, specify bin label, cover receptacle) and/or minor recommendations (proper waste segregation, provide segregation bins, attend seminar) are selected
- Encoder tracking: full name of the staff who encoded each report is recorded on save

#### Violations & Compliance

- **Violations module (OVR — City Ordinance Violations):**
  - Automatically created when an inspection is saved with a violated result and OVR number
  - Lists all violated city ordinances with individual fees and total fine
  - Payment status tracking: Unpaid / Paid / Waived
  - OR number and payment date recording
- **Compliance module (DENR/Environmental Requirements):**
  - Automatically created when an inspection has DENR/environmental recommendations
  - Per-item compliance tracking: Pending / Complied / Overdue
  - Deadline date computed from inspection date + compliance period
  - Overall status: Pending / Partially Complied / Fully Complied / Overdue
- Both modules are automatically synced whenever an inspection is created or updated
- Linked back to their source inspection via Inspection ID
- Tabbed view with stats summary cards

#### Reports

- CSV export for all major modules, filtered by selected year:
  - **Environmental Clearance Report** — all business records for the year
  - **No Payments Report** — businesses without payments for the year
  - **Inspection Reports CSV** — all inspection records including violations, recommendations, inspectors, encoder, and reinspection chain info
  - **Violation Records CSV** — all OVR records with ordinance details, fines, and payment status
  - **Compliance Records CSV** — all compliance records with per-item requirement status

#### Audit Trail

- Logs all Create, Update, and Delete actions across business records and inspection data
- Records user, timestamp, and before/after changes

#### Internal Chat

- Real-time messaging between office staff via Socket.IO
- Online/offline status indicators
- Unread message badges

---

### System-Wide Features

- Single active session enforcement — accounts cannot be logged in on multiple devices simultaneously
- 24-hour authentication token validity
- Auto-capitalize all data entry fields
- Account lock mechanism for security
- Real-time datetime display in sidebar

---

## Tech Stack

| Layer         | Technology                  |
| ------------- | --------------------------- |
| Runtime       | Node.js                     |
| Framework     | Express.js                  |
| Database      | MongoDB                     |
| Language      | JavaScript                  |
| Real-time     | Socket.IO                   |
| Email Service | Gmail (Google App Password) |

---

## Installation & Running the Project

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/your-repo-name.git
```

### 2. Navigate to the project directory

```bash
cd your-repo-name
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the application

```bash
npm start
```

---

## Accessing the System

- Currently accessed via local port forwarding using Visual Studio Code
- Not yet hosted online due to budget constraints

---

## Environment Variables

Create a `.env` file and configure the following:

```env
PORT=your_port
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_google_app_password
```

> Email features use Gmail's free service via Google App Password, which has sending limitations.

---

## Database Collections

| Collection          | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `business{YYYY}`    | Business records per year (2025–2030)                                |
| `seminar{YYYY}`     | Seminar records per year                                             |
| `inspectionReports` | All inspection reports across all years                              |
| `violationRecords`  | City ordinance violation records (auto-synced from inspections)      |
| `complianceRecords` | DENR/environmental compliance records (auto-synced from inspections) |
| `certificates`      | Generated assessment certificates                                    |
| `users`             | User accounts (Auth DB)                                              |

---

## Development Status

This system is:

- Actively used in the CENRO San Juan City office
- Continuously improved based on actual operational needs
- Built and maintained by a lone developer
- Far from perfect, but functional and evolving

---

## Planned Improvements / Roadmap

- UI/UX refinements across all modules
- Printable inspection report output (PDF generation)
- Enhanced role permissions and access policies
- Better error handling and logging
- Deployment to a proper hosting environment
- Code refactoring and optimization
- Improved email handling (non-Gmail API)
- System backup and recovery features
- Dashboard analytics for inspection and compliance statistics

---

## Limitations

- No paid hosting yet
- Email service limited by free Gmail API
- Limited development time due to work responsibilities
- No dedicated DevOps or QA support

---

## Contributions

This project is currently maintained by a single developer.
Suggestions and constructive feedback are welcome.

---

## Author

**Edzel Van Idos**
City Environment and Natural Resources Office
City Government of San Juan

_This project is a personal initiative to help improve internal processes and workflow efficiency._

---

## License

This project is intended for internal and educational use only.
