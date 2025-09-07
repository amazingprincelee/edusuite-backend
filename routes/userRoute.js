import express from "express";
import { userProfile, uploadImage } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js"
const router = express.Router();



router.get("/", isAuthenticated, userProfile);
router.post("/upload", isAuthenticated, uploadImage);



export default router;


