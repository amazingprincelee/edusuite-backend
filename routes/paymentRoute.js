import express from "express"
import {payment} from "../controllers/payControllers.js"

const router = express.Router()


router.post('/all', payment)

export default router