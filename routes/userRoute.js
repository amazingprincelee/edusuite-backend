import express from "express";
import { userProfile } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js"
const router = express.Router();



router.get("/", isAuthenticated, userProfile);



export default router;


