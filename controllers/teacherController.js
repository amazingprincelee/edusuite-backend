import Teacher from "../models/teachers.js";




export const addTeacher = async (req, res) => {

   

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

export const getTeachers = async (req, res) => {

    const teachers = await Teacher.find().populate("userId", "email fullname phone gender");

    if(!teachers){
        res.status(404).json({message: "Teachers not found"});
    }

    res.status(200).json({message: "teacher found", teachers})
}

export const getTeacherById = async (req, res) => {

    const foundTeacher = await Teacher.findById(req.body.userId)

    if(!foundTeacher){
        res.status(404).json({message: "Teacher not found"})
    }

    res.status(200).json({message: "Found Teachers", foundTeacher})
}