# TODO.md — Notification & Communication Platform (MediCore)

## Schema
- [x] Add Prisma enums + models for Notification & Communication platform in `backend/prisma/schema.prisma`
- [ ] Generate and verify Prisma client (`npm run prisma:generate`)
- [ ] Create migration (separate commands)

## Backend vertical slice
- [ ] Create types: `backend/src/types/notification.types.ts`
- [ ] Create validators: `backend/src/validators/notification.validator.ts`
- [ ] Create services:
  - [ ] `notification.service.ts`
  - [ ] `notificationQueue.service.ts`
  - [ ] `delivery.service.ts`
  - [ ] `escalation.service.ts`
  - [ ] `announcement.service.ts`
- [ ] Create controller: `backend/src/controllers/notification.controller.ts`
- [ ] Create routes with swagger: `backend/src/routes/notification.routes.ts`
- [ ] Wire routes in `backend/src/app.ts`

## Security/Audit integration
- [ ] Add audit event actions in Prisma schema if needed for notification logging
- [ ] Integrate `AuditService` calls for:
  - [ ] NOTIFICATION_CREATED
  - [ ] NOTIFICATION_SENT
  - [ ] NOTIFICATION_DELIVERED
  - [ ] NOTIFICATION_FAILED
  - [ ] ANNOUNCEMENT_CREATED
  - [ ] ESCALATION_TRIGGERED

## Tests
- [ ] Add unit tests for `NotificationService` and `EscalationService`
- [ ] Add integration tests for key flows (trigger -> queue -> delivery status update)

## Docs / outputs
- [ ] Swagger endpoint coverage for all routes
- [ ] Provide migration commands, verification commands, seed updates, test commands, and final git commit message

