import { z } from "zod";

export const savedSearchFiltersSchema = z.object({
  use: z.string().optional(),
  province: z.string().optional(),
  maxPrice: z.number().optional(),
  query: z.string().optional(),
});

export const createSavedSearchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  filters: savedSearchFiltersSchema,
});

export type CreateSavedSearchPayload = z.infer<typeof createSavedSearchSchema>;
export type SavedSearchFilters = z.infer<typeof savedSearchFiltersSchema>;

export interface SavedSearchDto {
  id: string;
  userId: string;
  name: string;
  filters: SavedSearchFilters;
  lastAlertSentAt?: string;
  createdAt: string;
}
