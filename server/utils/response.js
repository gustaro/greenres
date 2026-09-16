/**
 * Standardised API response helpers
 */

export const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

export const created = (res, data) => success(res, data, 201);

export const noContent = (res) => res.status(204).send();

export const paginated = (res, { data, total, page, limit }) =>
  res.json({
    success: true,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });

export const error = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ success: false, message });

export const notFound = (res, entity = "Resource") =>
  error(res, `${entity} not found`, 404);

export const unauthorized = (res, message = "Unauthorized") =>
  error(res, message, 401);

export const forbidden = (res, message = "Forbidden") =>
  error(res, message, 403);
