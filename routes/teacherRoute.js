import express from "express";
import { addTeacher, getTeachers, getTeacherById} from "../controllers/teacherController.js"
const router = express.Router();


router.get('/all', getTeachers)
router.get('/get-teacher', getTeacherById);
router.post('/add', addTeacher);


export default router
