export const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Multer errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Max 5MB allowed." });
    }
    return res.status(400).json({ message: err.message });
  }

  // Prisma errors
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "field";
    return res.status(409).json({ message: `${field} already exists` });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ message: "Record not found" });
  }

  // Stripe errors
  if (err.type?.startsWith("Stripe")) {
    return res.status(400).json({ message: err.message });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : "Internal server error";

  res.status(status).json({ message });
};

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
};
