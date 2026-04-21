export type SortOrder = "asc" | "desc";

export interface ApiMeta {
  requestId: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "INTERNAL_ERROR";

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  };
}

export interface ApiSuccess<TData, TMeta extends ApiMeta = ApiMeta> {
  ok: true;
  data: TData;
  meta: TMeta;
}

export type ApiResponse<TData, TMeta extends ApiMeta = ApiMeta> =
  | ApiSuccess<TData, TMeta>
  | ApiFailure;
