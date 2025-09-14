import express from "express";
import { getAllTeachers, getTeacherById, addTeacher, updateTeacher, deleteTeacher } from "../controllers/teacherController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = express.Router();

router.get('/all', getAllTeachers);
router.get('/:teacherId', getTeacherById);
router.post('/add-teacher', isAuthenticated, isAdmin, addTeacher);
router.put('/update', isAuthenticated, updateTeacher);
router.delete('/:teacherId', isAuthenticated, isAdmin, deleteTeacher);

export default router;