// controllers/examController.js
import Exam from "../models/exams.js";
import Result from "../models/result.js";
import Student from "../models/student.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";

export const createExam = async (req, res) => {
  try {
    const exam = new Exam({
      ...req.body,
      createdBy: req.user._id, 
    });
    await exam.save();
    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getExams = async (req, res) => {
  try {
    const exams = await Exam.find().populate("createdBy", "userId");
    res.status(200).json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get teacher's assigned classes and subjects
export const getTeacherClasses = async (req, res) => {
  try {
    const teacher = await User.findById(req.user._id);
    
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.status(200).json({
      classes: [], // TODO: Implement class assignment logic
      subjects: teacher.subjects || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get students in a specific class
export const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const students = await Student.find({ class: classId })
      .select('fullname admissionNumber')
      .sort({ fullname: 1 });

    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add or update CA scores
export const addCAScores = async (req, res) => {
  try {
    const { classId, subject, term, session, scores } = req.body;
    
    // Validate teacher authorization
    const teacher = await User.findById(req.user._id);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const results = [];
    
    for (const scoreData of scores) {
      const { studentId, caScore } = scoreData;
      
      // Check if CA result already exists
      let result = await Result.findOne({
        student: studentId,
        teacher: teacher._id,
        subject,
        term,
        session,
        scoreType: 'CA'
      });

      if (result) {
        // Update existing CA score
        result.caScore = caScore;
        result.updatedAt = new Date();
      } else {
        // Create new CA result
        result = new Result({
          student: studentId,
          teacher: teacher._id,
          subject,
          term,
          session,
          caScore,
          scoreType: 'CA'
        });
      }

      await result.save();
      results.push(result);
    }

    res.status(200).json({ 
      message: "CA scores saved successfully", 
      results 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add or update Exam scores
export const addExamScores = async (req, res) => {
  try {
    const { classId, subject, term, session, scores } = req.body;
    
    // Validate teacher authorization
    const teacher = await User.findById(req.user._id);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const results = [];
    
    for (const scoreData of scores) {
      const { studentId, examScore } = scoreData;
      
      // Check if exam result already exists
      let result = await Result.findOne({
        student: studentId,
        teacher: teacher._id,
        subject,
        term,
        session,
        scoreType: 'EXAM'
      });

      if (result) {
        // Update existing exam score
        result.examScore = examScore;
        result.updatedAt = new Date();
      } else {
        // Create new exam result
        result = new Result({
          student: studentId,
          teacher: teacher._id,
          subject,
          term,
          session,
          examScore,
          scoreType: 'EXAM'
        });
      }

      await result.save();
      results.push(result);
    }

    res.status(200).json({ 
      message: "Exam scores saved successfully", 
      results 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generate comprehensive results for a class/subject
export const generateResults = async (req, res) => {
  try {
    const { classId, subject, term, session } = req.body;
    
    // Validate teacher authorization
    const teacher = await User.findById(req.user._id);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Get all students in the class
    const students = await Student.find({ class: classId });
    
    const generatedResults = [];

    for (const student of students) {
      // Get CA and Exam scores for this student
      const caResult = await Result.findOne({
        student: student._id,
        teacher: teacher._id,
        subject,
        term,
        session,
        scoreType: 'CA'
      });

      const examResult = await Result.findOne({
        student: student._id,
        teacher: teacher._id,
        subject,
        term,
        session,
        scoreType: 'EXAM'
      });

      const caScore = caResult?.caScore || 0;
      const examScore = examResult?.examScore || 0;
      
      // Calculate total score (CA: 40%, Exam: 60%)
      const totalScore = Math.round((caScore * 0.4) + (examScore * 0.6));
      
      // Determine grade based on Nigerian education scheme
      let grade, remark, points;
      if (totalScore >= 70) {
        grade = 'A';
        remark = 'Excellent';
        points = 5;
      } else if (totalScore >= 60) {
        grade = 'B';
        remark = 'Very Good';
        points = 4;
      } else if (totalScore >= 50) {
        grade = 'C';
        remark = 'Good';
        points = 3;
      } else if (totalScore >= 45) {
        grade = 'D';
        remark = 'Pass';
        points = 2;
      } else if (totalScore >= 40) {
        grade = 'E';
        remark = 'Poor';
        points = 1;
      } else {
        grade = 'F';
        remark = 'Fail';
        points = 0;
      }

      // Create or update comprehensive result
      let result = await Result.findOne({
        student: student._id,
        teacher: teacher._id,
        subject,
        term,
        session,
        scoreType: 'FINAL'
      });

      if (result) {
        // Update existing result
        result.caScore = caScore;
        result.examScore = examScore;
        result.totalScore = totalScore;
        result.grade = grade;
        result.remark = remark;
        result.points = points;
        result.updatedAt = new Date();
      } else {
        // Create new comprehensive result
        result = new Result({
          student: student._id,
          teacher: teacher._id,
          subject,
          term,
          session,
          caScore,
          examScore,
          totalScore,
          grade,
          remark,
          points,
          scoreType: 'FINAL'
        });
      }

      await result.save();
      
      // Populate student data for response
      await result.populate('student', 'fullname admissionNumber');
      
      generatedResults.push({
        studentId: student._id,
        studentName: student.fullname,
        admissionNumber: student.admissionNumber,
        caScore,
        examScore,
        totalScore,
        grade,
        remark,
        points
      });
    }

    // Calculate class positions
    generatedResults.sort((a, b) => b.totalScore - a.totalScore);
    generatedResults.forEach((result, index) => {
      result.position = index + 1;
    });

    // Create notifications for parents about new results
    try {
      const notificationPromises = students.map(async (student) => {
        // Populate parent information
        await student.populate('parentId');
        
        if (student.parentId) {
          const studentResult = generatedResults.find(r => r.studentId.toString() === student._id.toString());
          
          return Notification.create({
            recipient: student.parentId._id,
            sender: teacher._id,
            type: 'result',
            title: 'New Result Available',
            message: `${term} ${subject} results for ${student.fullname} are now available. Total Score: ${studentResult?.totalScore || 0}/${100}, Grade: ${studentResult?.grade || 'N/A'}`,
            data: {
              studentId: student._id,
              subject,
              term,
              session,
              totalScore: studentResult?.totalScore || 0,
              grade: studentResult?.grade || 'N/A',
              position: studentResult?.position || 'N/A'
            },
            priority: 'high',
            actionUrl: '/parent-dashboard/results'
          });
        }
      });

      await Promise.all(notificationPromises.filter(Boolean));
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the entire operation if notifications fail
    }

    res.status(200).json({
      message: "Results generated successfully",
      results: generatedResults,
      classInfo: {
        classId,
        subject,
        term,
        session,
        totalStudents: generatedResults.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get existing scores for a class/subject
export const getClassScores = async (req, res) => {
  try {
    const { classId, subject, term, session } = req.query;
    
    // Validate teacher authorization
    const teacher = await User.findById(req.user._id);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Get all students in the class
    const students = await Student.find({ class: classId })
      .select('fullname admissionNumber')
      .sort({ fullname: 1 });

    const scoresData = [];

    for (const student of students) {
      // Get CA and Exam scores
      const caResult = await Result.findOne({
        student: student._id,
        teacher: teacher._id,
        subject,
        term,
        session,
        scoreType: 'CA'
      });

      const examResult = await Result.findOne({
        student: student._id,
        teacher: teacher._id,
        subject,
        term,
        session,
        scoreType: 'EXAM'
      });

      scoresData.push({
        studentId: student._id,
        studentName: student.fullname,
        admissionNumber: student.admissionNumber,
        caScore: caResult?.caScore || null,
        examScore: examResult?.examScore || null
      });
    }

    res.status(200).json(scoresData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin Analytics Functions

// Get exam analytics overview
export const getExamAnalytics = async (req, res) => {
  try {
    const { term, session } = req.query;
    
    // Get total teachers who have submitted results
    const teachersWithResults = await Result.distinct('teacher', {
      ...(term && { term }),
      ...(session && { session })
    });

    // Get total teachers
    const totalTeachers = await User.countDocuments({ role: "teacher" });

    // Get teachers who haven't submitted results
    const teachersWithoutResults = await User.find({
      role: "teacher",
      _id: { $nin: teachersWithResults }
    }).select('fullname email phone');

    // Get top performing students
    const topStudents = await Result.aggregate([
      {
        $match: {
          scoreType: 'FINAL',
          totalScore: { $exists: true, $ne: null },
          ...(term && { term }),
          ...(session && { session })
        }
      },
      {
        $group: {
          _id: '$student',
          averageScore: { $avg: '$totalScore' },
          totalSubjects: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $unwind: '$studentInfo'
      },
      {
        $sort: { averageScore: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          studentName: '$studentInfo.fullname',
          admissionNumber: '$studentInfo.admissionNumber',
          class: '$studentInfo.class',
          averageScore: { $round: ['$averageScore', 2] },
          totalSubjects: 1
        }
      }
    ]);

    // Get subject performance statistics
    const subjectStats = await Result.aggregate([
      {
        $match: {
          scoreType: 'FINAL',
          totalScore: { $exists: true, $ne: null },
          ...(term && { term }),
          ...(session && { session })
        }
      },
      {
        $group: {
          _id: '$subject',
          averageScore: { $avg: '$totalScore' },
          totalStudents: { $sum: 1 },
          passCount: {
            $sum: {
              $cond: [{ $gte: ['$totalScore', 50] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          subject: '$_id',
          averageScore: { $round: ['$averageScore', 2] },
          totalStudents: 1,
          passCount: 1,
          passRate: {
            $round: [
              { $multiply: [{ $divide: ['$passCount', '$totalStudents'] }, 100] },
              2
            ]
          }
        }
      },
      {
        $sort: { averageScore: -1 }
      }
    ]);

    // Get recent result submissions
    const recentSubmissions = await Result.find({
      ...(term && { term }),
      ...(session && { session })
    })
    .populate('teacher', 'userId')
    .populate('student', 'fullname admissionNumber')
    .populate({
      path: 'teacher',
      populate: {
        path: 'userId',
        select: 'fullname'
      }
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.status(200).json({
      overview: {
        totalTeachers,
        teachersWithResults: teachersWithResults.length,
        teachersWithoutResults: totalTeachers - teachersWithResults.length,
        submissionRate: Math.round((teachersWithResults.length / totalTeachers) * 100)
      },
      topStudents,
      subjectStats,
      teachersWithoutResults: teachersWithoutResults.map(teacher => ({
        _id: teacher._id,
        name: teacher.fullname,
        email: teacher.email,
        phone: teacher.phone,
        status: "active"
      })),
      recentSubmissions: recentSubmissions.map(result => ({
        _id: result._id,
        teacherName: result.teacher?.userId?.fullname,
        studentName: result.student?.fullname,
        subject: result.subject,
        scoreType: result.scoreType,
        submittedAt: result.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get detailed teacher result submission status
export const getTeacherSubmissionStatus = async (req, res) => {
  try {
    const { term, session } = req.query;
    
    const teachers = await User.find({ role: "teacher" })
      .select('fullname email phone');

    const teacherStatus = await Promise.all(
      teachers.map(async (teacher) => {
        const resultCount = await Result.countDocuments({
          teacher: teacher._id,
          ...(term && { term }),
          ...(session && { session })
        });

        const subjects = await Result.distinct('subject', {
          teacher: teacher._id,
          ...(term && { term }),
          ...(session && { session })
        });

        const lastSubmission = await Result.findOne({
          teacher: teacher._id,
          ...(term && { term }),
          ...(session && { session })
        }).sort({ createdAt: -1 });

        return {
          _id: teacher._id,
          name: teacher.fullname,
          email: teacher.email,
          phone: teacher.phone,
          status: "active", // Default status since User model doesn't have status field
          resultCount,
          subjects,
          subjectCount: subjects.length,
          lastSubmission: lastSubmission?.createdAt,
          hasSubmitted: resultCount > 0
        };
      })
    );

    res.status(200).json(teacherStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
