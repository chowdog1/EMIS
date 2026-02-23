# Environmental Management Information System (EMIS)

## Overview
The **Environmental Management Information System (EMIS)** is a personal project developed to support the **City Environment and Natural Resources Office (CENRO)** of **San Juan City Government**.

This system aims to automate environmental processes, reduce manual paperwork, and improve record management for business establishments under environmental regulation.

EMIS was created and is currently maintained by a single developer and is still a work in progress.

---

## Purpose
This project was developed to:
- Automate the generation of Environmental Assessment Certificates
- Centralize and manage the database of business establishments
- Assist the office in seminar coordination and documentation
- Improve accountability through audit trails
- Support internal communication via an internal chat tool

---

## Features
- Automated generation of Assessment Certificates
- Business Establishment Database Management (Add / Update / Delete)
- Audit Trail for business record modifications
- Email sending for:
  - Seminar Invitations
  - Certificates of Participation
- Internal Chat Tool for office use
- User access and internal system controls

---

## Tech Stack
- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB
- Language: JavaScript
- Email Service: Gmail (Free API using Google App Password)

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
- The system is currently accessed via local port forwarding
- Port forwarding is done using Visual Studio Code
- The project is not yet hosted online due to budget constraints

---

## Environment Variables
Create a `.env` file and configure the following:

```env
PORT=your_port
MONGODB_URI=your_mongodb_connection_string
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_google_app_password
```

Note:  
Email features use Gmail’s free service via Google App Password, which has limitations.

---

## Development Status
This system is:
- Actively used and improved
- Far from perfect
- Built and maintained by a lone developer
- Created after returning to programming with no formal professional development background

Despite this, the system is functional and continuously evolving based on actual office needs.

---

## Planned Improvements / Roadmap
- UI/UX improvements
- Role-based access control
- Better error handling and logging
- Deployment to a proper hosting environment
- Code refactoring and optimization
- Improved email handling (non-Gmail API)

---

## Limitations
- No paid hosting yet
- Email service limited by free Gmail API
- Limited development time due to work responsibilities

---

## Contributions
This project is currently maintained by a single developer.  
Suggestions and constructive feedback are welcome.

---

## Author
**Edzel Van Idos**  
City Environment and Natural Resources Office  
San Juan City Government  

This project is a personal initiative to help improve internal processes and workflow efficiency.

---

## License
This project is intended for internal and educational use.
