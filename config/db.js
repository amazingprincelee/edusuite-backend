import mongoose from "mongoose";

export default function connectDb(){

    mongoose.connect("mongodb://localhost:27017/bedetelsDb")
    .then(()=>{
        console.log("Database is connected");
        
    })

}