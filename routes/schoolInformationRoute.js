import express from "express";
import { addInformation, getSchoolInfo, updateSchoolInfo, uploadImage, uploadGallery} from "../controllers/schoolInformation.js"
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAdmin } from "../middlewares/isAdmin.js";
const router = express();


router.get('/', getSchoolInfo);
router.post('/add', isAuthenticated, isAdmin, addInformation);
router.post('/upload', isAuthenticated, isAdmin, uploadImage);
// Upload multiple gallery images
router.post("/upload-gallery", uploadGallery);
router.put('/update/:schoolId',isAuthenticated, isAdmin, updateSchoolInfo );



export default router;