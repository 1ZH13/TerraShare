/**
 * Field adapters that normalize data between the canonical shared contract
 * (packages/shared) and the internal field names used by app-web components.
 *
 * These adapters are the single place where field name translation happens.
 * When the real API replaces the mock, only these functions need to change.
 */

import type { LandDto, RentalRequestDto } from "@terrashare/shared";

/**
 * Normalizes a Land from the shared contract to the shape expected by app-web components.
 * Handles field name differences:
 *   title → name, priceRule.pricePerMonth → monthlyPrice, area → areaHectares, etc.
 */
export function toLandCard(land) {
  return {
    id: land.id,
    ownerId: land.ownerId,
    name: land.title,
    province: land.location?.province ?? "",
    district: land.location?.district ?? "",
    type: land.allowedUses?.[0] ?? "",
    monthlyPrice: land.priceRule?.pricePerMonth ?? 0,
    areaHectares: land.area,
    availableFrom: land.availability?.availableFrom ?? "",
    availableTo: land.availability?.availableTo ?? "",
    allowedUses: land.allowedUses ?? [],
    summary: land.description ?? "",
    // Internal fields the UI may use
    waterSource: land.waterSource ?? "",
    createdAt: land.createdAt,
    updatedAt: land.updatedAt,
  };
}

/**
 * Normalizes a RentalRequest from shared contract to the shape expected by app-web components.
 * Handles: period.startDate/endDate → startDate/endDate, enriched fields from context
 */
export function toRentalRequestCard(request, enriched = {}) {
  return {
    id: request.id,
    landId: request.landId,
    tenantId: request.tenantId,
    startDate: request.period?.startDate ?? "",
    endDate: request.period?.endDate ?? "",
    intendedUse: request.intendedUse,
    message: request.notes ?? "",
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    // Enriched fields from listing context
    landName: enriched.landName ?? "",
    ownerId: enriched.ownerId ?? null,
    tenantName: enriched.tenantName ?? "",
    tenantEmail: enriched.tenantEmail ?? "",
    monthlyPrice: enriched.monthlyPrice ?? 0,
    landType: enriched.landType ?? "",
  };
}

/**
 * Builds filter params for listLands from the app-web filter state.
 * Converts UI filter names to the shared LandFilterDto shape.
 */
export function toLandFilters(filters = {}) {
  const { type, location, maxPrice, availableOn } = filters;
  return {
    use: type !== "all" ? type : undefined,
    province: location || undefined,
    district: location || undefined,
    priceMax: maxPrice ? Number(maxPrice) : undefined,
    availableFrom: availableOn || undefined,
    availableTo: availableOn || undefined,
  };
}
