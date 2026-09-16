import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export const hashPassword = (password) => bcrypt.hash(password, 12);

export const comparePassword = (password, hashed) => bcrypt.compare(password, hashed);

export const generateTokens = (userId) => ({
  accessToken: jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES }),
  refreshToken: jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES }),
});

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

export const saveRefreshToken = (userId, refreshToken) =>
  prisma.user.update({ where: { id: userId }, data: { refreshToken } });

export const revokeRefreshToken = (userId) =>
  prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });

export const findUserByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

export const findUserById = (id) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, phone: true, role: true },
  });
