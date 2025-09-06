import "dotenv/config";
import express from "express";
import fileUpload from "express-fileupload";
import http from "http";
import { Server } from "socket.io";
import connectDb from "./config/db.js";
import authRoute from "./routes/authRoute.js";
import studentRoute from "./routes/studentRoute.js";
import classRoute from "./routes/classRoute.js";
import teacherRoute from "./routes/teacherRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import userRoute from "./routes/userRoute.js";

const app = express();

const httpServer = http.createServer(app)


const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
} );

app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(fileUpload({
    useTempFiles: true
}))

 connectDb()

 app.use("/auth", authRoute),
 app.use("/student", studentRoute);
 app.use("/class", classRoute);
 app.use("/teacher", teacherRoute);
 app.use('/payment', paymentRoute);
 app.use("/user", userRoute);




const PORT = process.env.PORT || 3002;

httpServer.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
    
})