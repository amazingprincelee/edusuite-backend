import express from 'express';
import { addStudent, getStudents, getStudentById, getStudentByClass } from "../controllers/studentController.js"
const router = express.Router();



router.get('/all',  getStudents);
router.get('/id/:studentId',  getStudentById);
router.get('/class/:classLevel',  getStudentByClass);
router.post('/add',  addStudent);


export default router;