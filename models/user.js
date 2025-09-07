import mongoose from "mongoose";



const usersSchema  = new mongoose.Schema({
    fullname: {type: String, required: true},
    email: {type: String, unique: true},
    phone: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    gender: { type: String, enum: ["Male", "Female"]},
    address: String,
    profilePhoto: String,
    role: {type: String, enum: ['admin', "superadmin", "teacher", "parent"]},
    createdAt: {type: Date, default: Date.now},
});



const User = mongoose.model("User", usersSchema);

export default User;