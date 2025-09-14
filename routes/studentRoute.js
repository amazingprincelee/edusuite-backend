import express from "express";
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
} from "../controllers/studentController.js";
const router = express.Router();

router.get("/all", getStudent);
router.get("/id/:studentId", getStudentById);
router.get("/class/:classLevel", getStudentByClass);
router.post("/add", addStudent);
router.post("/upload-image/:studentId", uploadImage);
router.put("/update/:studentId", updateStudent);
router.put("/promote/:studentId", promoteStudent);
router.put("/demote/:studentId", demoteStudent);
router.post("/bulk-promote", bulkPromoteStudents);
router.get("/promotion-suggestions/:currentClass", getPromotionSuggestions);

export default router;
