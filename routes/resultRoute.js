import express from "express";
import { enterResult, getStudentResults } from "../controllers/resultController.js";
const router = express.Router();

router.post("/", enterResult);  
router.get("/:studentId", getStudentResults);

export default router;
