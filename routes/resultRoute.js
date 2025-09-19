import express from "express";
import { 
  enterResult, 
  getStudentResults,
  getParentChildrenResults,
  getClassResultsSummary,
  bulkUpdateResults
} from "../controllers/resultController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Basic result routes
router.post("/", isAuthenticated, enterResult);  
router.get("/student/:studentId", isAuthenticated, getStudentResults);

// Parent routes
router.get("/parent/children", isAuthenticated, getParentChildrenResults);

// Teacher routes
router.get("/class/summary", isAuthenticated, getClassResultsSummary);
router.put("/bulk-update", isAuthenticated, bulkUpdateResults);

export default router;
