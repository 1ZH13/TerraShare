export interface ReviewDto {
  id: string;
  contractId: string;
  reviewerId: string;
  targetUserId: string;
  landId?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewDto {
  contractId: string;
  rating: number;
  comment?: string;
}
