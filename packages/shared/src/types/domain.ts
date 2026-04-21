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
  | "chat";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "paid"
  | "status_changed";
