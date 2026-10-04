export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} tidak ditemukan`);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.");
    this.name = "RateLimitError";
  }
}

export interface ErrorResponse {
  message: string;
  code: string;
  field?: string;
}

export function mapPgError(error: any): ErrorResponse {
  // Unique constraint violation
  if (error.code === "23505") {
    return { message: "Data sudah ada di sistem", code: "DUPLICATE_ENTRY" };
  }
  
  // Foreign key violation
  if (error.code === "23503") {
    return { message: "Referensi data tidak valid", code: "INVALID_REFERENCE" };
  }
  
  // Check constraint violation
  if (error.code === "23514") {
    return { message: "Data tidak memenuhi ketentuan", code: "CONSTRAINT_VIOLATION" };
  }
  
  // Not null violation
  if (error.code === "23502") {
    return { message: "Data wajib diisi", code: "REQUIRED_FIELD" };
  }
  
  // Invalid text representation
  if (error.code === "22P02") {
    return { message: "Format data tidak valid", code: "INVALID_FORMAT" };
  }
  
  return { message: "Terjadi kesalahan. Silakan coba lagi.", code: "UNKNOWN_ERROR" };
}

export function createApiErrorResponse(error: any): { error: ErrorResponse; status: number } {
  if (error instanceof ValidationError) {
    return {
      error: { message: error.message, code: "VALIDATION_ERROR", field: error.field },
      status: 400,
    };
  }
  
  if (error instanceof NotFoundError) {
    return {
      error: { message: error.message, code: "NOT_FOUND" },
      status: 404,
    };
  }
  
  if (error instanceof RateLimitError) {
    return {
      error: { message: error.message, code: "RATE_LIMITED" },
      status: 429,
    };
  }
  
  // PostgreSQL errors (SQLSTATE)
  if (error?.code) {
    return {
      error: mapPgError(error),
      status: 400,
    };
  }
  
  // Default error
  return {
    error: { message: "Terjadi kesalahan internal", code: "INTERNAL_ERROR" },
    status: 500,
  };
}
