import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDb from "./config/db.js";
import authRoute from "./routes/authRoute.js";
import studentRoute from "./routes/studentRoute.js";
import classRoute from "./routes/classRoute.js";
import teacherRoute from "./routes/teacherRoute.js";
const app = express();

const httpServer = http.createServer(app)


const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
} );

app.use(express.json())
app.use(express.urlencoded({extended: false}))

 connectDb()

 app.use("/auth", authRoute),
 app.use("/student", studentRoute);
 app.use("/class", classRoute);
 app.use("/teacher", teacherRoute);




const PORT = process.env.PORT || 3002;

httpServer.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
    
})