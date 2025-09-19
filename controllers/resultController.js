import Result from "../models/result.js";
import Student from "../models/student.js";
import Exam from "../models/exams.js";
import Notification from "../models/notification.js";

// Enter result for a student
export const enterResult = async (req, res) => {
  try {
    const { studentId, examId, score, grade } = req.body;
    const teacherId = req.user._id;

    const result = new Result({
      student: studentId,
      exam: examId,
      score,
      grade,
      teacher: teacherId
    });

    await result.save();
    
    // Create notification for parent
    const student = await Student.findById(studentId).populate('parent');
    const exam = await Exam.findById(examId);
    
    if (student && student.parent && exam) {
      const notification = new Notification({
        recipient: student.parent._id,
        type: 'result_available',
        title: 'New Result Available',
        message: `${exam.subject} ${exam.title} result is now available for ${student.name}`,
        data: {
          studentId,
          examId,
          resultId: result._id,
          subject: exam.subject,
          score,
          grade
        }
      });
      await notification.save();
    }

    res.status(201).json({ message: "Result entered successfully", result });
  } catch (error) {
    res.status(500).json({ message: "Error entering result", error: error.message });
  }
};

// Get results for a specific student
export const getStudentResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const results = await Result.find({ student: studentId })
      .populate('exam', 'title subject date')
      .populate('teacher', 'name');
    
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Error fetching results", error: error.message });
  }
};

// Get results for parent's children
export const getParentChildrenResults = async (req, res) => {
  try {
    const parentId = req.user._id;
    
    // Find all children of this parent
    const children = await Student.find({ parent: parentId });
    const childrenIds = children.map(child => child._id);
    
    const results = await Result.find({ student: { $in: childrenIds } })
      .populate('student', 'name class')
      .populate('exam', 'title subject date')
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Error fetching children results", error: error.message });
  }
};

// Get class results summary for teacher
export const getClassResultsSummary = async (req, res) => {
  try {
    const { classId, subject } = req.query;
    const teacherId = req.user._id;
    
    const query = { teacher: teacherId };
    if (classId) query.classId = classId;
    if (subject) query.subject = subject;
    
    const exams = await Exam.find(query);
    const examIds = exams.map(exam => exam._id);
    
    const results = await Result.find({ exam: { $in: examIds } })
      .populate('student', 'name admissionNumber')
      .populate('exam', 'title subject date')
      .sort({ 'exam.date': -1 });
    
    // Group results by exam
    const groupedResults = results.reduce((acc, result) => {
      const examId = result.exam._id.toString();
      if (!acc[examId]) {
        acc[examId] = {
          exam: result.exam,
          results: []
        };
      }
      acc[examId].results.push(result);
      return acc;
    }, {});
    
    res.status(200).json(Object.values(groupedResults));
  } catch (error) {
    res.status(500).json({ message: "Error fetching class results", error: error.message });
  }
};

// Bulk update results
export const bulkUpdateResults = async (req, res) => {
  try {
    const { results } = req.body; // Array of {resultId, score, grade}
    const teacherId = req.user._id;
    
    const updatePromises = results.map(async (resultData) => {
      const result = await Result.findOneAndUpdate(
        { _id: resultData.resultId, teacher: teacherId },
        { score: resultData.score, grade: resultData.grade },
        { new: true }
      );
      return result;
    });
    
    const updatedResults = await Promise.all(updatePromises);
    
    res.status(200).json({ 
      message: "Results updated successfully", 
      updatedCount: updatedResults.filter(r => r).length 
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating results", error: error.message });
  }
};
