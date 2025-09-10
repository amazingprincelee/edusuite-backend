import express from "express";
import { getAllTeachers, getTeacherById, updateTeacher} from "../controllers/teacherController.js";
import { isAuthenticated} from "../middlewares/isAuthenticated.js"
import { isAdmin } from "../middlewares/isAdmin.js"
import { register } from "../controllers/authcontrollers.js"
const router = express.Router();


router.get('/all', getAllTeachers)
router.get('/:teacherId', getTeacherById);
router.post('/register-teacher', isAuthenticated, isAdmin, register)
router.put('/update', updateTeacher);


export default router;
