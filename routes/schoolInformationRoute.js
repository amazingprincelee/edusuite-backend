import express from "express";
import {
  addInformation,
  getSchoolInfo,
  updateSchoolInfo,
  uploadImage,
  uploadGallery,
  deleteSchoolInfo,
  deleteSchoolLogo,
  deleteGalleryImage
} from "../controllers/schoolInformationController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = express.Router(); // Use express.Router() instead of express()

router.get("/", getSchoolInfo);
router.post("/add", isAuthenticated, isAdmin, addInformation);
router.post("/upload", isAuthenticated, isAdmin, uploadImage);
router.post("/upload-gallery", isAuthenticated, isAdmin, uploadGallery); // Added middleware for consistency
router.put("/update/:schoolId", isAuthenticated, isAdmin, updateSchoolInfo);
router.delete("/delete/:schoolId", isAuthenticated, isAdmin, deleteSchoolInfo); // Added deleteSchoolInfo route
router.delete("/delete-logo", isAuthenticated, isAdmin, deleteSchoolLogo); // Added deleteSchoolLogo route
router.delete("/delete-gallery-image", isAuthenticated, isAdmin, deleteGalleryImage); // Added deleteGalleryImage route

export default router;