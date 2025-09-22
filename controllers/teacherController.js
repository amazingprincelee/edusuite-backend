import User from "../models/user.js";
import { register } from "./authcontrollers.js";



export const addTeacher = async (req, res) => {
  try {
    const {
      fullname,
      email,
      password,
      phone,
      gender,
      address,
      subjects,
      designation,
      salary,
      status,
      bankName,
      bankAccount,
      accountName
    } = req.body;

    // Prepare the request body for the auth controller register function
    const teacherData = {
      fullname,
      email,
      password,
      phone,
      gender,
      address,
      role: "teacher",
      subjects,
      designation,
      salary,
      status,
      bankName,
      bankAccount,
      accountName
    };

    // Create a mock request object for the auth controller
    const mockReq = {
      body: teacherData
    };

    // Create a mock response object to capture the auth controller response
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 201) {
            // Success - teacher registered
            res.status(201).json({
              message: "Teacher created successfully and login credentials sent via email",
              teacher: data.newUser,
              credentialsInfo: data.credentialsInfo
            });
          } else {
            // Error occurred
            res.status(code).json(data);
          }
        }
      })
    };

    // Use the auth controller register function
    await register(mockReq, mockRes);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


export const updateTeacher = async (req, res) => {
  try {
    const {
      userId,
      fullname,
      email,
      phone,
      gender,
      address,
      salary,
      subjects,
      designation,
    } = req.body;

    // Find the user with teacher role
    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Update user fields
    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (address) user.address = address;
    if (salary !== undefined) user.salary = salary;
    if (subjects && subjects.length) user.subjects = subjects;
    if (designation) user.designation = designation;

    await user.save();

    res.status(200).json({
      message: "Teacher updated successfully",
      teacher: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        address: user.address,
        salary: user.salary,
        subjects: user.subjects,
        designation: user.designation,
        role: user.role,
        createdAt: user.createdAt
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
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
};

export const deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find the user with teacher role
    const user = await User.findById(teacherId);
    if (!user || user.role !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Delete the user
    await User.findByIdAndDelete(teacherId);

    res.status(200).json({ 
      message: "Teacher deleted successfully",
      deletedTeacher: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



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

export const getTeacherDashboard = async (req, res) => {
  try {
    // Get teacher ID from authenticated user
    const teacherId = req.user.id;
    
    // Verify the user is a teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(403).json({ message: "Access denied. Teacher role required." });
    }

    // Mock dashboard data - you can replace this with actual database queries
    const stats = {
      totalClasses: 5,
      totalStudents: 120,
      pendingResults: 8,
      completedExams: 12
    };

    const recentActivities = [
      {
        id: 1,
        type: "exam",
        description: "Math Quiz submitted by Class 10A",
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        type: "assignment",
        description: "Science assignment graded for Class 9B",
        timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }
    ];

    res.status(200).json({
      message: "Dashboard data retrieved successfully",
      stats,
      recentActivities
    });

  } catch (error) {
    console.error("Error fetching teacher dashboard:", error);
    res.status(500).json({ 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};