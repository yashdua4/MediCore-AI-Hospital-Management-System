## ERD (overview)

### 🗄️ Database Architecture Overview

The AI-Powered Hospital & Healthcare Management System follows a relational database architecture designed for scalability, security, data integrity, and healthcare compliance.

### Core Entities

- Users
- Roles
- Patients
- Doctors
- Departments
- Appointments
- Medical Records
- AI Interactions
- Notifications
- Audit Logs

### Entity Relationships

- One Role → Many Users
- One Patient → Many Appointments
- One Doctor → Many Appointments
- One Patient → Many Medical Records
- One Department → Many Doctors
- One User → Many Audit Logs

### Design Principles

✅ Data Normalization

✅ Referential Integrity

✅ Secure Healthcare Data Storage

✅ High Availability

✅ Scalability for Future Modules

## Module schemas

### Users Table

| Field | Type |
| --- | --- |
| id | UUID |
| full_name | VARCHAR |
| email | VARCHAR |
| password_hash | VARCHAR |
| role_id | UUID |
| created_at | TIMESTAMP |

---

### Roles Table

| Field | Type |
| --- | --- |
| id | UUID |
| role_name | VARCHAR |
| permissions | JSON |

---

### Patients Table

| Field | Type |
| --- | --- |
| id | UUID |
| patient_id | VARCHAR |
| full_name | VARCHAR |
| gender | VARCHAR |
| dob | DATE |
| contact_number | VARCHAR |

---

### Doctors Table

| Field | Type |
| --- | --- |
| id | UUID |
| doctor_code | VARCHAR |
| full_name | VARCHAR |
| specialization | VARCHAR |
| department_id | UUID |

---

### Departments Table

| Field | Type |
| --- | --- |
| id | UUID |
| department_name | VARCHAR |
| description | TEXT |

---

### Appointments Table

| Field | Type |
| --- | --- |
| id | UUID |
| patient_id | UUID |
| doctor_id | UUID |
| appointment_date | DATETIME |
| status | VARCHAR |

---

### Medical Records Table

| Field | Type |
| --- | --- |
| id | UUID |
| patient_id | UUID |
| diagnosis | TEXT |
| prescription | TEXT |
| created_by | UUID |
| visit_date | DATETIME |
| notes | TEXT |

---

### Audit Logs Table

| Field | Type |
| --- | --- |
| id | UUID |
| user_id | UUID |
| action | VARCHAR |
| timestamp | DATETIME |
| ip_address | VARCHAR |
| device_info | TEXT |

## Migration strategy

### 🚀 Database Migration Strategy

The project follows a version-controlled migration approach to maintain consistency across development, testing, staging, and production environments.

### Migration Process

1. Create migration file
2. Review schema changes
3. Apply migration in development
4. Execute automated tests
5. Deploy to staging
6. Deploy to production

### Migration Rules

- No direct production schema changes
- Every schema change must have rollback support
- Database backups required before production deployment
- Migration scripts reviewed before execution

### Rollback Strategy

In case of deployment failure:

- Restore latest backup
- Execute rollback migration
- Validate data integrity
- Re-run health checks

### Compliance & Security

✅ Audit logging enabled

✅ Data integrity validation

✅ Backup verification

✅ Production approval required
