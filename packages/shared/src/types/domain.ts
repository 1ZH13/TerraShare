export type AppRole = "user" | "admin";

export type EntityStatus = "active" | "inactive" | "blocked";

export type BusinessCurrency = "USD" | "PAB";

export type AuditableEntity =
  | "auth"
  | "user"
  | "land"
  | "rental_request"
  | "contract"
  | "payment"
  | "chat"
  | "webhook";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "paid"
  | "refunded"
  | "signed"
  | "completed"
  | "status_changed";

export type Resource =
  | "land"
  | "rental_request"
  | "contract"
  | "payment"
  | "chat"
  | "notification"
  | "audit_event"
  | "lead";

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "transition"
  | "sign"
  | "complete"
  | "initiate";
