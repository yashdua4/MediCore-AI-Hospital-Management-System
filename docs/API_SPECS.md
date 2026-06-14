## API conventions

- Base URL

Development:
http://localhost:5000/api/v1

Production:
https://api.medicore-ai.com/api/v1

- Versioning

API versioning follows URL-based versioning.

Example:
GET /api/v1/patients
GET /api/v1/doctors
GET /api/v1/appointments

Future versions:
GET /api/v2/patients

- Error format

{
"success": false,
"message": "Validation failed",
"errors": [
{
"field": "email",
"message": "Invalid email format"
}
]
}

## Auth

### Security Standards

- JWT Authentication
- Refresh Tokens
- HTTP Only Cookies
- Password Hashing (bcrypt)
- Role-Based Access Control (RBAC)

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | /auth/register | Register a new user |
| POST | /auth/login | Login user |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout current user |
| GET | /auth/profile | Get logged-in user profile |
| PATCH | /auth/change-password | Change password |

## Modules

## Patient Management

| Method | Endpoint |
| --- | --- |
| GET | /patients |
| GET | /patients/:id |
| POST | /patients |
| PUT | /patients/:id |
| DELETE | /patients/:id |

---

## Doctor Management

| Method | Endpoint |
| --- | --- |
| GET | /doctors |
| GET | /doctors/:id |
| POST | /doctors |
| PUT | /doctors/:id |
| DELETE | /doctors/:id |

---

## Appointment Management

| Method | Endpoint |
| --- | --- |
| GET | /appointments |
| GET | /appointments/:id |
| POST | /appointments |
| PUT | /appointments/:id |
| DELETE | /appointments/:id |

---

## Department Management

| Method | Endpoint |
| --- | --- |
| GET | /departments |
| POST | /departments |
| PUT | /departments/:id |
| DELETE | /departments/:id |

---

## Medical Records

| Method | Endpoint |
| --- | --- |
| GET | /medical-records |
| GET | /medical-records/:id |
| POST | /medical-records |
| PUT | /medical-records/:id |
| DELETE | /medical-records/:id |

---

## AI Healthcare Assistant

| Method | Endpoint |
| --- | --- |
| POST | /ai/chat |
| POST | /ai/symptom-check |
| POST | /ai/medical-summary |

### AI Features

- Symptom Analysis
- Medical Record Summarization
- Healthcare Assistant Chat
- Smart Recommendations

---

## Audit Logs

| Method | Endpoint |
| --- | --- |
| GET | /audit-logs |
| GET | /audit-logs/:id |

### Compliance

- User Activity Tracking
- Security Event Monitoring
- Access Logging
- Change History Tracking
