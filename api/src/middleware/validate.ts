import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

/**
 * Validates and coerces request parts with Zod, replacing the raw object with
 * the parsed (typed, defaulted) value. Validation failures become a 400 via
 * the central error handler.
 */
export function validate<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny>(schemas: {
  body?: B;
  query?: Q;
  params?: P;
}): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as unknown as Request['query'];
      if (schemas.params) req.params = schemas.params.parse(req.params) as unknown as Request['params'];
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Helper to read a validated query as its inferred type. */
export function typedQuery<Q extends ZodTypeAny>(req: Request): z.infer<Q> {
  return req.query as unknown as z.infer<Q>;
}

export function typedBody<B extends ZodTypeAny>(req: Request): z.infer<B> {
  return req.body as z.infer<B>;
}
