import Student from "../models/student.js";

export const addStudent = async (req, res) => {
  const {
    parentId,
    firstName,
    surName,
    middleName,
    dateOfBirth,
    gender,
    classLevel,
    section,
    stateOfOrigin,
    nationality,
    fatherName,
    motherName,
    guardianName,
    phoneNumber,
    email,
    address,
    currentSession,
    currentTerm,

  } = req.body;


const parentInfo = { 
    fatherName: fatherName,
    motherName: motherName,
    guardianName: guardianName,
    phoneNumber: phoneNumber,
    email: email,
    address: address,
}


if(currentTerm !== "first" && currentTerm !== "second" && currentTerm !== "third" ){
    res.status(401).json({message: "Incorrent term name format, please use first, second or third"})
}

const student = await Student.findOne({firstName: firstName, surName: surName, dateOfBirth: dateOfBirth})

if(student){
    res.status(400).json({message: "Student is already registered"})
}

const newStudent = new Student({
    parentId:  parentId,
    firstName: firstName,
    surName: surName,
    middleName: middleName,
    dateOfBirth: dateOfBirth,
    gender: gender,
    classLevel: classLevel,
    section: section,
    stateOfOrigin: stateOfOrigin,
    nationality: nationality,
    parentInfo: parentInfo,
    currentSession: currentSession,
    currentTerm: currentTerm
});

await newStudent.save()

res.status(200).json({message: "Student registered successfully", newStudent})

};


export const getStudents = async (req, res)=>{
    // find all student from database
    const foundStudents = await Student.find();

    if(!foundStudents){
        res.status(404).json({message: "No student found"});
    }

    res.status(200).json({Message:"Successfully found students", foundStudents})

};


export const getStudentByClass = async (req, res) => {

    try {

        const classLevel = req.params.classLevel

        const classFound = await Student.find({classLevel: classLevel });

    if(!classFound){
        res.status(404).json({message: "No class found"})
    };

    res.status(200).json({message: "Class found successfully", classFound})
        
    } catch (error) {
       res.status(500).json({message:"Internal Server error", error: error.message}) 
    }

    

};

export const getStudentById = async (req, res) => {
   try {

    const studentId = req.params.studentId;

    console.log(studentId);
    

    const student = await Student.findById(studentId).populate("paymentId", "balance status").populate("parentId", "fullname address phone");
     
    console.log(student);
    

    if(!student) {
        res.status(404).json({message: "Student not found"})
    };

    res.status(200).json({message: "Student found", student})
    
   } catch (error) {
     res.status(500).json({message: "Internal Server Error"})
   }
}


