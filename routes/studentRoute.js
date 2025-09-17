import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js";
import {
  addStudent,
  getStudent,
  getStudentById,
  getStudentByClass,
  uploadImage,
  promoteStudent,
  demoteStudent,
  bulkPromoteStudents,
  getPromotionSuggestions,
  updateStudent,
  deleteStudent
} from "../controllers/studentController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
const router = express.Router();

router.get("/all",isAuthenticated, isAdmin, getStudent);
router.get("/id/:studentId", isAuthenticated, isAdmin, getStudentById);
router.get("/class/:classLevel", isAuthenticated, isAdmin, getStudentByClass);
router.post("/add", isAuthenticated, isAdmin, addStudent);
router.post("/upload-image/:studentId", uploadImage);
router.put("/update/:studentId", isAuthenticated, isAdmin, updateStudent);
router.delete("/:studentId", isAuthenticated, isAdmin, deleteStudent);
router.put("/promote/:studentId", isAuthenticated, isAdmin, promoteStudent);
router.put("/demote/:studentId", isAuthenticated, isAdmin, demoteStudent);
router.post("/bulk-promote", isAuthenticated, isAdmin, bulkPromoteStudents);
router.get("/promotion-suggestions/:currentClass", isAuthenticated, isAdmin, getPromotionSuggestions);

export default router;
