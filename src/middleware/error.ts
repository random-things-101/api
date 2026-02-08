/**
 * Error handling middleware
 */
import { Context, Next } from 'hono';

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('❌ Error:', error);

    // Handle custom API errors
    if (error instanceof ApiError) {
      return c.json({ error: error.message }, error.statusCode);
    }

    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return c.json({ error: 'Validation error', details: error }, 400);
    }

    // Handle MySQL errors
    if (error instanceof Error) {
      if (error.message.includes('ER_NO_REFERENCED_ROW')) {
        return c.json({ error: 'Foreign key constraint failed' }, 400);
      }
      if (error.message.includes('ER_DUP_ENTRY')) {
        return c.json({ error: 'Duplicate entry' }, 409);
      }
    }

    // Generic server error
    return c.json({ error: 'Internal server error' }, 500);
  }
};

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper functions for common errors
export const badRequest = (message: string) => new ApiError(message, 400);
export const notFound = (message: string) => new ApiError(message, 404);
export const conflict = (message: string) => new ApiError(message, 409);
