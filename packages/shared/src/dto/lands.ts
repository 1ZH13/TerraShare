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
}

export interface UpdateLandDto {
  title?: string;
  description?: string;
  area?: number;
  allowedUses?: LandUse[];
  location?: Partial<LandLocationDto>;
  availability?: LandAvailabilityDto;
  priceRule?: LandPriceRuleDto;
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
