/**
 * Permisos para las tools (#234). Reexporta los helpers `can*` del backend para
 * que las tools apliquen exactamente las mismas reglas que la API REST — sin
 * duplicar lógica. Úsalos con `ctx.actingUser`.
 *
 * Ejemplo en una tool:
 *   if (!canMutateLand(ctx.actingUser!, land)) throw new ToolError("No autorizado");
 */
export {
  isAdmin,
  isOwnerOrAdmin,
  canMutateLand,
  canReadRentalRequest,
  canListRentalRequests,
  canCreateRentalRequest,
  canTransitionRentalRequest,
  canCreateContract,
  canReadContract,
  canMutateContract,
  canInitiatePayment,
  canReadPayment,
} from "@backend/lib/auth-helpers";
