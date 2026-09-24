import { Router } from "express";
import {
  getAllUsers, getUserById, updateProfile, changePassword,
  updateUserRole, updateUserStatus, updateUserPoints, deleteUser, addAddress, updateAddress, deleteAddress, createUser,
  getPointsHistory, uploadAvatar,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);
router.post("/avatar", upload.single("avatar"), uploadAvatar);
router.get("/points-history", getPointsHistory);

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
router.put("/:id/points", isAdmin, updateUserPoints);
router.delete("/:id", isAdmin, deleteUser);

export default router;
