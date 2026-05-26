export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [key: string]: unknown;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly problemDetails: ProblemDetails;

  constructor(status: number, code: string, problemDetails: ProblemDetails) {
    super(problemDetails.detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.problemDetails = problemDetails;
  }
}
