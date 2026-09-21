import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";

import { AiAdapterError } from "../ai/ai-adapter.js";
import { ProductDomainError } from "../domain/types.js";
import { type ErrorResponse, errorResponseSchema } from "./schemas.js";

type StableProductErrorCode = ErrorResponse["error"]["code"];

export class HttpError extends Error {
  readonly status: number;
  readonly code: StableProductErrorCode;
  readonly retryable: boolean;
  readonly requestId?: string;
  readonly details?: readonly { field: string; issue: string }[];

  constructor(
    status: number,
    code: StableProductErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      requestId?: string;
      details?: readonly { field: string; issue: string }[];
    } = {},
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export function notFoundError(resource: string): HttpError {
  return new HttpError(404, "NOT_FOUND", `${resource} was not found.`);
}

function mapDomainError(error: ProductDomainError): HttpError {
  const status = error.code === "NOT_FOUND" ? 404 : 409;
  return new HttpError(status, error.code, error.message);
}

function mapAiError(error: AiAdapterError): HttpError {
  if (error.code === "PROVIDER_TIMEOUT") {
    return new HttpError(504, "AI_TIMEOUT", error.message, {
      retryable: error.retryable,
      requestId: error.requestId,
    });
  }
  if (error.code === "PAYLOAD_TOO_LARGE") {
    return new HttpError(413, "PAYLOAD_TOO_LARGE", error.message, {
      retryable: error.retryable,
      requestId: error.requestId,
    });
  }
  if (error.code === "PROVIDER_UNAVAILABLE") {
    return new HttpError(503, "AI_PROVIDER_UNAVAILABLE", error.message, {
      retryable: error.retryable,
      requestId: error.requestId,
    });
  }
  return new HttpError(503, "AI_INVALID_RESPONSE", error.message, {
    retryable: error.retryable,
    requestId: error.requestId,
  });
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof ProductDomainError) {
    return mapDomainError(error);
  }
  if (error instanceof AiAdapterError) {
    return mapAiError(error);
  }
  if (error instanceof multer.MulterError) {
    const payloadTooLarge = error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FILE_COUNT";
    return new HttpError(
      payloadTooLarge ? 413 : 422,
      payloadTooLarge ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR",
      "Observation frame upload is invalid.",
      { details: [{ field: "frames", issue: error.message }] },
    );
  }
  if (error instanceof ZodError) {
    return new HttpError(422, "VALIDATION_ERROR", "Request validation failed.", {
      details: error.issues.map((issue) => ({
        field: issue.path.join(".") || "request",
        issue: issue.message,
      })),
    });
  }

  return new HttpError(500, "INVALID_STATE", "An unexpected application error occurred.");
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new HttpError(404, "NOT_FOUND", "Endpoint was not found."));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const mapped = toHttpError(error);
  const body = errorResponseSchema.parse({
    error: {
      code: mapped.code,
      message: mapped.message,
      retryable: mapped.retryable,
      ...(mapped.requestId ? { requestId: mapped.requestId } : {}),
      ...(mapped.details ? { details: mapped.details } : {}),
    },
  });

  response.status(mapped.status).json(body);
};
