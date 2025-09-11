import express from "express";
import { createClass, getClass } from "../controllers/classController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAdmin } from "../middlewares/isAdmin.js"
const router = express.Router();


router.get("/", isAuthenticated, getClass);
router.post("/create", isAuthenticated, isAdmin, createClass);


export default router
