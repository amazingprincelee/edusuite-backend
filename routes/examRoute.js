import express from "express";
import { 
  createExam, 
  getExams, 
  getTeacherClasses,
  getClassStudents,
  addCAScores,
  addExamScores,
  generateResults,
  getClassScores,
  getExamAnalytics,
  getTeacherSubmissionStatus
} from "../controllers/examController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Basic exam routes
router.post("/", isAuthenticated, createExam);   // teacher creates exam
router.get("/", isAuthenticated, getExams);      

// Teacher exam/CA management routes
router.get("/teacher/classes", isAuthenticated, getTeacherClasses);
router.get("/class/:classId/students", isAuthenticated, getClassStudents);
router.get("/scores", isAuthenticated, getClassScores);
router.post("/ca-scores", isAuthenticated, addCAScores);
router.post("/exam-scores", isAuthenticated, addExamScores);
router.post("/generate-results", isAuthenticated, generateResults);

// Admin analytics routes
router.get("/analytics", isAuthenticated, getExamAnalytics);
router.get("/teacher-status", isAuthenticated, getTeacherSubmissionStatus);

export default router;
