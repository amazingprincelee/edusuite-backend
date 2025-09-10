import express from "express";
import { userProfile, uploadImage, updateProfile, changePassword } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js"
const router = express.Router();



router.get("/", isAuthenticated, userProfile);
router.post("/upload", isAuthenticated, uploadImage);
router.put("/update", isAuthenticated, updateProfile);
router.patch("/change-password", isAuthenticated, changePassword);



export default router;


