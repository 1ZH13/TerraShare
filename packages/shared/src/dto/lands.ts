import type { BusinessCurrency } from "../types/domain";
import type { SortOrder } from "../types/api";

export type LandUse =
  | "agricultura"
  | "ganaderia"
  | "forestal"
  | "acuicultura"
  | "mixto"
  | "otro";

export type LandStatus = "draft" | "active" | "inactive";

/** Tipo de operación de una publicación: alquiler, venta o ambas (#138). */
export type LandOperation = "alquiler" | "venta" | "ambas";

export type LandSortField = "createdAt" | "price" | "area";

export interface LandLocationDto {
  province: string;
  district: string;
  corregimiento?: string;
  addressLine?: string;
  lat?: number;
  lng?: number;
}

export interface LandAvailabilityDto {
  availableFrom?: string;
  availableTo?: string;
}

export interface LandPriceRuleDto {
  currency: BusinessCurrency;
  pricePerMonth: number;
}

export interface LandDto {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  area: number;
  allowedUses: LandUse[];
  location: LandLocationDto;
  availability: LandAvailabilityDto;
  priceRule: LandPriceRuleDto;
  status: LandStatus;
  /** Tipo de operación; por defecto "alquiler" si el backend no lo envía. */
  operation?: LandOperation;
  /** Precio de venta (aplica cuando operation es "venta" o "ambas"). */
  salePrice?: number;
  /** Fuente/acceso a agua del terreno (#138). */
  water?: string;
  /** Tipo de acceso al terreno (#138). */
  access?: string;
  /** Características destacadas del terreno (#138). */
  features?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandDto {
  title: string;
  description?: string;
  area: number;
  allowedUses: LandUse[];
  location: LandLocationDto;
  availability?: LandAvailabilityDto;
  priceRule: LandPriceRuleDto;
  operation?: LandOperation;
  salePrice?: number;
  water?: string;
  access?: string;
  features?: string[];
}

export interface UpdateLandDto {
  title?: string;
  description?: string;
  area?: number;
  allowedUses?: LandUse[];
  location?: Partial<LandLocationDto>;
  availability?: LandAvailabilityDto;
  priceRule?: LandPriceRuleDto;
  operation?: LandOperation;
  salePrice?: number;
  water?: string;
  access?: string;
  features?: string[];
}

export interface UpdateLandStatusDto {
  status: LandStatus;
}

export interface LandFilterDto {
  page?: number;
  pageSize?: number;
  sort?: LandSortField;
  order?: SortOrder;
  use?: LandUse;
  priceMin?: number;
  priceMax?: number;
  province?: string;
  district?: string;
  availableFrom?: string;
  availableTo?: string;
}
