// controllers/examController.js
import Exam from "../models/exams.js";

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
