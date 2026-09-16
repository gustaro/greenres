import { Router } from "express";
import {
  getAllUsers, getUserById, updateProfile, changePassword,
  updateUserRole, updateUserStatus, deleteUser, addAddress, updateAddress, deleteAddress, createUser,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

// Addresses
router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);

// Admin only
router.get("/", isAdmin, getAllUsers);
router.post("/", isAdmin, createUser);
router.get("/:id", isAdmin, getUserById);
router.put("/:id/role", isAdmin, updateUserRole);
router.put("/:id/status", isAdmin, updateUserStatus);
router.delete("/:id", isAdmin, deleteUser);

export default router;
