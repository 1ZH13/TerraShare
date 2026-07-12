/**
 * Permisos para las tools (#234). Reexporta los helpers `can*` del backend para
 * que las tools apliquen exactamente las mismas reglas que la API REST — sin
 * duplicar lógica. Úsalos con `ctx.actingUser`.
 *
 * Ejemplo en una tool:
 *   if (!canMutateLand(ctx.actingUser!, land)) throw new ToolError("No autorizado");
 */
// Reexporta TODOS los helpers de permisos del backend (isAdmin, isOwnerOrAdmin,
// isParticipant, canMutateLand, canReadRentalRequest, canListRentalRequests,
// canCreateRentalRequest, canTransitionRentalRequest, canCreateContract,
// canReadContract, canMutateContract, canInitiatePayment, canReadPayment,
// canListPayments, canReadChat, canReadNotification, canAccessAuditEvents).
export * from "@backend/lib/auth-helpers";
