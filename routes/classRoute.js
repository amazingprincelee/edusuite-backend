import express from "express";
import { createClass, getClass } from "../controllers/classController.js"
const router = express.Router();


router.get("/", getClass);
router.post("/create", createClass);


export default router
