/**
 * User type definition
 */
export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  createdAt: Date;
};

/**
 * API response wrapper type
 */
export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
  error?: string;
};

/**
 * Pagination metadata
 */
export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

/**
 * Paginated response type
 */
export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};
