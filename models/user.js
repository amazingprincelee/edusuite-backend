import mongoose from "mongoose";



const usersSchema  = new mongoose.Schema({
    fullname: {type: String, required: true},
    username: {type: String, unique: true, sparse: true}, // Can be phone or email for login
    email: {type: String, unique: true, sparse: true}, // Made optional with sparse index
    phone: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    generatedParentPassword: {type: String},
    gender: { type: String, enum: ["Male", "Female", "male", "female"]},
    address: String,
    profilePhoto: String,
    role: {type: String, enum: ['admin', "superadmin", "teacher", "parent"]},
    subjects: [{ type: String, default: null }],
    salary: { type: Number, default: 0 },
    designation: { type: String, default: null }, // e.g., "Senior Teacher", "Head of Department"
    isVerified: {type: Boolean, default: false},
    createdAt: {type: Date, default: Date.now},
});



const User = mongoose.model("User", usersSchema);

export default User;