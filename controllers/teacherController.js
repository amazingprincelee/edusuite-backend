import Teacher from "../models/teachers.js";
import User from "../models/user.js";
import crypto from "crypto";
import bcrypt from "bcrypt";



export const addTeacher = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phone,
      gender,
      address,
      salary,
      subjects,
      designation,
      bankName,
      bankAccount,
      accountName,
    } = req.body;

    // 1. Check if teacher already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: "Teacher with this email or phone already exists" });
    }

    // 2. Generate random password
    const randomPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // 3. Create User
    const newUser = await User.create({
      fullname,
      email,
      phone,
      password: hashedPassword,
      gender,
      address,
      role: "teacher",
      salary,
      subjects,
      designation,
    });

    // 4. Create Teacher linked to User
    const newTeacher = await Teacher.create({
      userId: newUser._id,
      status: "full time", // default
      bankDetails: { bankName, bankAccount, accountName },
    });

    // 5. Send email with login credentials
    // const emailMessage = `
    //   Hello ${fullname},
    //   Your teacher account has been created.
    //   Email: ${email}
    //   Password: ${randomPassword}
    //   Please login and change your password.
    // `;

    // await sendEmail(email, "Your Teacher Account", emailMessage);

    res.status(201).json({
      message: "Teacher created successfully and login credentials sent via email",
      teacher: newTeacher,
      user: { email, fullname },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};


export const updateTeacher = async (req, res) => {
  try {
    const {
      userId,
      salary,
      subjects,
      designation,
      bankName,
      bankAccount,
      accountName,
    } = req.body;

    // 1. Find the teacher record linked to the user
    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // 2. Update Teacher document
    teacher.bankDetails = {
      bankName: bankName || teacher.bankDetails.bankName,
      bankAccount: bankAccount || teacher.bankDetails.bankAccount,
      accountName: accountName || teacher.bankDetails.accountName,
    };
    teacher.updatedAt = Date.now();

    await teacher.save();

    // 3. Update User document
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Linked user not found" });
    }

    user.salary = salary !== undefined ? salary : user.salary;
    user.subjects = subjects && subjects.length ? subjects : user.subjects;
    user.designation = designation || user.designation;

    await user.save();

    res.status(200).json({
      message: "Teacher updated successfully",
      teacher,
      user: {
        fullname: user.fullname,
        email: user.email,
        salary: user.salary,
        subjects: user.subjects,
        designation: user.designation,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const getAllTeachers = async (req, res) => {

    try {

         const teachers = await User.find({role: "teacher"});

    if(!teachers){
        res.status(404).json({message: "Teachers not found"});
    }

    res.status(200).json({message: "teacher found", teachers})
        
    } catch (error) {
        res.status(200).json({message:"Internal server error"})
    }

   
}



export const getTeacherById = async (req, res) => {

    try {

        const teacherId = req.params.teacherId

    const teacher = await User.findById(teacherId);

    const role = teacher.role

    if(role !== "teacher"){
        res.status(404).json({message: "Teacher not found"})
    }

    res.status(200).json({message: "Found teacher", teacher})
        
    } catch (error) {
        res.status(500).json({message: "Internal server error"})
    }

    
}