import Student from "../models/student.js";
import ClassList from "../models/classList.js";
import { upload, isCloudinaryConnected } from "../config/cloudinary.js";

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
  };

  if (
    currentTerm !== "first" &&
    currentTerm !== "second" &&
    currentTerm !== "third"
  ) {
    res.status(401).json({
      message: "Incorrent term name format, please use first, second or third",
    });
  }

  const student = await Student.findOne({
    firstName: firstName,
    surName: surName,
    dateOfBirth: dateOfBirth,
  });

  if (student) {
    res.status(400).json({ message: "Student is already registered" });
  }

  const newStudent = new Student({
    parentId: parentId,
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
    currentTerm: currentTerm,
  });

  await newStudent.save();

  res
    .status(200)
    .json({ message: "Student registered successfully", newStudent });
};

export const getStudent = async (req, res) => {
  // find all student from database
  const foundStudents = await Student.find();

  if (!foundStudents) {
    res.status(404).json({ message: "No student found" });
  }

  res
    .status(200)
    .json({ Message: "Successfully found students", foundStudents });
};

export const getStudentByClass = async (req, res) => {
  try {
    const classLevel = req.params.classLevel;

    const classFound = await Student.find({ classLevel: classLevel });

    if (!classFound) {
      res.status(404).json({ message: "No class found" });
    }

    res.status(200).json({ message: "Class found successfully", classFound });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const student = await Student.findById(studentId)
      .populate("paymentId", "balance status")
      .populate("parentId", "fullname address phone");

    console.log(student);

    if (!student) {
      res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student found", student });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update student information
export const updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
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

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Validate class level if provided
    if (classLevel) {
      const classExists = await ClassList.findOne({ level: classLevel });
      if (!classExists) {
        return res.status(400).json({ message: "Invalid class level" });
      }
    }

    // Validate term if provided
    if (currentTerm && !["first", "second", "third"].includes(currentTerm)) {
      return res.status(400).json({ 
        message: "Incorrect term name format, please use first, second or third" 
      });
    }

    const parentInfo = {
      fatherName: fatherName || student.parentInfo.fatherName,
      motherName: motherName || student.parentInfo.motherName,
      guardianName: guardianName || student.parentInfo.guardianName,
      phoneNumber: phoneNumber || student.parentInfo.phoneNumber,
      email: email || student.parentInfo.email,
      address: address || student.parentInfo.address,
    };

    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        firstName: firstName || student.firstName,
        surName: surName || student.surName,
        middleName: middleName || student.middleName,
        dateOfBirth: dateOfBirth || student.dateOfBirth,
        gender: gender || student.gender,
        classLevel: classLevel || student.classLevel,
        section: section || student.section,
        stateOfOrigin: stateOfOrigin || student.stateOfOrigin,
        nationality: nationality || student.nationality,
        parentInfo,
        currentSession: currentSession || student.currentSession,
        currentTerm: currentTerm || student.currentTerm,
        updatedAt: new Date(),
      },
      { new: true }
    );

    res.status(200).json({
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const uploadImage = async (req, res) => {
  try {
     const studentId = req.params.studentId;
     const { image } = req.files;
     const fileTypes = ["image/jpeg", "image/png", "image/jpg"];
     const imageSize = 1024;
     
    if(image){

      if (!fileTypes.includes(image.mimetype)) {
        return res
          .status(400)
          .json({ success: false, error: "image should be jpeg, jpg or png" });
      }

    }else{
      return res.status(400).json({message: "image file error"})
    }

    //Validate image size
      if (image.size / 1024 > imageSize) {
        return res
          .status(400)
          .json({
            success: false,
            error: `Image size is greater than ${imageSize}`,
          });
      }
    

     const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }


     const isConnected = await isCloudinaryConnected();
    if (!isConnected) {
      return res.status(400).json({message:"Cloudinary is not reachable. Check your internet or credentials."});
    }

     const imageUrl = await upload(image.tempFilePath, student._id);

     if (!imageUrl) {
      return res.status(500).json({ message: "Image upload failed" });
    }
     
     student.studentPhoto = imageUrl.secure_url; 
     await student.save();

    res
      .status(200)
      .json({
        message: "Successfully uploaded student photo image",
        studentPhoto: student.studentPhoto
      });

  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};




// Promote individual student
export const promoteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const { 
      newClassLevel, 
      newSection, 
      newSession, 
      reason = "Promotion", 
      promotedBy 
    } = req.body;

    // Validate required fields
    if (!newClassLevel) {
      return res.status(400).json({ 
        success: false, 
        message: "New class level is required" 
      });
    }

    // Check if the new class level exists in ClassList
    const classExists = await ClassList.findOne({ level: newClassLevel });
    if (!classExists) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid class level" 
      });
    }

    // Find the student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    // Store current class for history
    const currentClass = student.classLevel;
    const currentSession = student.currentSession;

    // Create promotion history entry
    const promotionEntry = {
      fromClass: currentClass,
      toClass: newClassLevel,
      session: newSession || currentSession,
      promotionDate: new Date(),
      reason: reason,
      promotedBy: promotedBy || null
    };

    // Update student details
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        classLevel: newClassLevel,
        section: newSection || student.section,
        currentSession: newSession || currentSession,
        updatedAt: new Date(),
        $push: { promotionHistory: promotionEntry }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Student promoted from ${currentClass} to ${newClassLevel}`,
      data: updatedStudent
    });

  } catch (error) {
    console.error("Error promoting student:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Demote individual student
export const demoteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      newClassLevel, 
      newSection, 
      reason = "Demotion", 
      promotedBy 
    } = req.body;

    // Validate required fields
    if (!newClassLevel) {
      return res.status(400).json({ 
        success: false, 
        message: "New class level is required" 
      });
    }

    // Check if the new class level exists in ClassList
    const classExists = await ClassList.findOne({ level: newClassLevel });
    if (!classExists) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid class level" 
      });
    }

    // Find the student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    // Store current class for history
    const currentClass = student.classLevel;
    const currentSession = student.currentSession;

    // Create demotion history entry
    const demotionEntry = {
      fromClass: currentClass,
      toClass: newClassLevel,
      session: currentSession,
      promotionDate: new Date(),
      reason: reason,
      promotedBy: promotedBy || null
    };

    // Update student details
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        classLevel: newClassLevel,
        section: newSection || student.section,
        updatedAt: new Date(),
        $push: { promotionHistory: demotionEntry }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Student demoted from ${currentClass} to ${newClassLevel}`,
      data: updatedStudent
    });

  } catch (error) {
    console.error("Error demoting student:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Bulk promote students
export const bulkPromoteStudents = async (req, res) => {
  try {
    const { 
      studentIds, 
      promotionRules,
      newSession,
      reason = "Bulk Promotion",
      promotedBy
    } = req.body;

    // Validate input
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student IDs array is required"
      });
    }

    if (!promotionRules || typeof promotionRules !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Promotion rules are required"
      });
    }

    // Get all valid class levels
    const allClasses = await ClassList.find({});
    const validClasses = allClasses.map(c => c.level);

    const promotionResults = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Process each student
    for (const studentId of studentIds) {
      try {
        const student = await Student.findById(studentId);
        
        if (!student) {
          promotionResults.failed.push({
            studentId,
            reason: "Student not found"
          });
          continue;
        }

        const currentClass = student.classLevel;
        const newClassLevel = promotionRules[currentClass];

        // Skip if no promotion rule for this class
        if (!newClassLevel) {
          promotionResults.skipped.push({
            studentId,
            studentName: `${student.firstName} ${student.surName}`,
            currentClass,
            reason: "No promotion rule defined for this class"
          });
          continue;
        }

        // Validate new class level exists
        if (!validClasses.includes(newClassLevel)) {
          promotionResults.failed.push({
            studentId,
            studentName: `${student.firstName} ${student.surName}`,
            currentClass,
            reason: `Invalid target class: ${newClassLevel}`
          });
          continue;
        }

        // Skip if already in target class
        if (currentClass === newClassLevel) {
          promotionResults.skipped.push({
            studentId,
            studentName: `${student.firstName} ${student.surName}`,
            currentClass,
            reason: "Already in target class"
          });
          continue;
        }

        // Create promotion history entry
        const promotionEntry = {
          fromClass: currentClass,
          toClass: newClassLevel,
          session: newSession || student.currentSession,
          promotionDate: new Date(),
          reason: reason,
          promotedBy: promotedBy || null
        };

        // Update student
        const updatedStudent = await Student.findByIdAndUpdate(
          studentId,
          {
            classLevel: newClassLevel,
            currentSession: newSession || student.currentSession,
            updatedAt: new Date(),
            $push: { promotionHistory: promotionEntry }
          },
          { new: true }
        );

        promotionResults.successful.push({
          studentId,
          studentName: `${student.firstName} ${student.surName}`,
          fromClass: currentClass,
          toClass: newClassLevel,
          admissionNumber: student.admissionNumber
        });

      } catch (error) {
        promotionResults.failed.push({
          studentId,
          reason: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk promotion completed. ${promotionResults.successful.length} promoted, ${promotionResults.failed.length} failed, ${promotionResults.skipped.length} skipped`,
      data: promotionResults
    });

  } catch (error) {
    console.error("Error in bulk promotion:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


// Helper function to get promotion suggestions based on current class
export const getPromotionSuggestions = async (req, res) => {
  try {
    const { currentClass } = req.params;
    
    // Get all available classes
    const allClasses = await ClassList.find({}).sort({ level: 1 });
    
    // Define typical promotion flow (you can customize this)
    const promotionMap = {
      "Nursery 1": "Nursery 2",
      "Nursery 2": "Pre-KG",
      "Pre-KG": "KG",
      "KG": "Primary 1",
      "Primary 1": "Primary 2",
      "Primary 2": "Primary 3",
      "Primary 3": "Primary 4",
      "Primary 4": "Primary 5",
      "Primary 5": "Primary 6",
      "Primary 6": "JSS 1",
      "JSS 1": "JSS 2",
      "JSS 2": "JSS 3",
      "JSS 3": "SS 1",
      "SS 1": "SS 2",
      "SS 2": "SS 3",
      "SS 3": "Graduated"
    };

    const suggestion = promotionMap[currentClass] || null;
    
    res.status(200).json({
      success: true,
      data: {
        currentClass,
        suggestedPromotion: suggestion,
        allAvailableClasses: allClasses.map(c => c.level)
      }
    });

  } catch (error) {
    console.error("Error getting promotion suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete student
export const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Student.findByIdAndDelete(studentId);

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
