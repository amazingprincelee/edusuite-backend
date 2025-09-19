import express from "express";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendBulkNotifications
} from "../controllers/notificationController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

// User notification routes
router.get("/", isAuthenticated, getUserNotifications);
router.put("/:notificationId/read", isAuthenticated, markAsRead);
router.put("/mark-all-read", isAuthenticated, markAllAsRead);
router.delete("/:notificationId", isAuthenticated, deleteNotification);

// Notification preferences
router.get("/preferences", isAuthenticated, getNotificationPreferences);
router.put("/preferences", isAuthenticated, updateNotificationPreferences);

// Create notification (for system/admin use)
router.post("/", isAuthenticated, createNotification);
router.post("/bulk", isAuthenticated, sendBulkNotifications);

export default router;