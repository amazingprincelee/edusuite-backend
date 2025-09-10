import Teacher from "../models/teachers.js";
import User from "../models/user.js";




export const updateTeacher = async (req, res) => {

   

    try {

        const {userId, salary, subject, designation, bankName, bankaccount, accountName } = req.body;

        const teacher = await Teacher.findById(userId)

        if(teacher){
            res.status(400).json({message: "Teacher already registered"});
        }

        const bankDetails = {
            bankName: bankName,
            bankaccount: bankaccount,
            accountName: accountName
        }

        const newTeacher = new Teacher({
            userId: userId,
            salary: salary,
            subjects: subject,
            designation: designation,
            bankDetails: bankDetails
        })

        newTeacher.save();

        res.status(200).json({message: "Teacher Registered Successfully", newTeacher})
        
    } catch (error) {
        res.status(500).json({message: "Internal Server Error", error})
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