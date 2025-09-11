import mongoose from "mongoose";



const classSchema = new mongoose.Schema({
    level: { type: String, required: true, unique: true }
});


const ClassList = mongoose.model("ClassList", classSchema);

export default ClassList;