import type { AuthContextUser } from "../types";

export function isAdmin(user: AuthContextUser) {
  return user.role === "admin";
}

export function isOwnerOrAdmin(user: AuthContextUser, ownerId: string) {
  return isAdmin(user) || user.id === ownerId;
}
