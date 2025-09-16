import express from "express";
import { createClass, getClass, deleteClass} from "../controllers/classController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAdmin } from "../middlewares/isAdmin.js"
const router = express.Router();


router.get("/", isAuthenticated, getClass);
router.post("/create", isAuthenticated, isAdmin, createClass);
router.delete("/:id", isAuthenticated, isAdmin, deleteClass);




export default router
