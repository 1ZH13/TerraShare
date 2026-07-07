import type { AuthContextUser } from "../types";

export function isAdmin(user: AuthContextUser) {
  return user.role === "admin";
}

export function isOwnerOrAdmin(user: AuthContextUser, ownerId: string) {
  return isAdmin(user) || user.id === ownerId;
}

export function isParticipant(
  chat: { participants: { userId: string }[] },
  userId: string,
) {
  return chat.participants.some((participant) => participant.userId === userId);
}

export function canMutateLand(
  user: AuthContextUser,
  land: { ownerId: string },
) {
  return isOwnerOrAdmin(user, land.ownerId);
}

export function canReadRentalRequest(
  user: AuthContextUser,
  request: { tenantId: string },
  land: { ownerId: string },
) {
  return (
    isAdmin(user) ||
    request.tenantId === user.id ||
    land.ownerId === user.id
  );
}

export function canListRentalRequests(
  user: AuthContextUser,
  ownerLandIds: string[],
): Record<string, unknown> {
  if (isAdmin(user)) return {};
  return {
    $or: [{ tenantId: user.id }, { landId: { $in: ownerLandIds } }],
  };
}

export function canCreateRentalRequest(
  user: AuthContextUser,
  land: { ownerId: string },
) {
  return land.ownerId !== user.id;
}

export function canTransitionRentalRequest(
  user: AuthContextUser,
  request: { tenantId: string },
  land: { ownerId: string },
  nextStatus: string,
) {
  const isOwner = isOwnerOrAdmin(user, land.ownerId);
  const isTenant = request.tenantId === user.id;

  if (isAdmin(user)) return true;

  if (nextStatus === "cancelled") {
    return isOwner || isTenant;
  }

  const ownerOnlyStatuses = ["approved", "rejected"];
  if (ownerOnlyStatuses.includes(nextStatus)) {
    return isOwner;
  }

  return isOwner || isTenant;
}

export function canCreateContract(
  user: AuthContextUser,
  land: { ownerId: string },
) {
  return isOwnerOrAdmin(user, land.ownerId);
}

export function canReadContract(
  user: AuthContextUser,
  contract: { ownerId: string; tenantId: string },
) {
  return (
    isAdmin(user) ||
    contract.ownerId === user.id ||
    contract.tenantId === user.id
  );
}

export function canMutateContract(
  user: AuthContextUser,
  contract: { ownerId: string },
) {
  return isOwnerOrAdmin(user, contract.ownerId);
}

export function canInitiatePayment(
  user: AuthContextUser,
  request: { tenantId: string },
) {
  return isAdmin(user) || request.tenantId === user.id;
}

export function canReadPayment(
  user: AuthContextUser,
  request: { tenantId: string },
  land: { ownerId: string },
) {
  return (
    isAdmin(user) ||
    request.tenantId === user.id ||
    land.ownerId === user.id
  );
}

export function canListPayments(
  user: AuthContextUser,
  requestIds: string[],
): Record<string, unknown> {
  if (isAdmin(user)) return {};
  return { rentalRequestId: { $in: requestIds } };
}

export function canReadChat(
  user: AuthContextUser,
  chat: { participants: { userId: string }[] },
) {
  return isAdmin(user) || isParticipant(chat, user.id);
}

export function canReadNotification(
  user: AuthContextUser,
  notification: { userId: string },
) {
  return isAdmin(user) || notification.userId === user.id;
}

export function canAccessAuditEvents(user: AuthContextUser) {
  return isAdmin(user);
}
