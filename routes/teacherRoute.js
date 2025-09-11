import express from "express";
import { getAllTeachers, getTeacherById, addTeacher,updateTeacher} from "../controllers/teacherController.js";
import { isAuthenticated} from "../middlewares/isAuthenticated.js"
import { isAdmin } from "../middlewares/isAdmin.js"

const router = express.Router();
 
//Very important not, the teacher is register as a user, so that is why the register in authentication is used

router.get('/all', getAllTeachers)
router.get('/:teacherId', getTeacherById);
router.post('/add-teacher', isAuthenticated, isAdmin, addTeacher)
router.put('/update', isAuthenticated, updateTeacher);


export default router;
