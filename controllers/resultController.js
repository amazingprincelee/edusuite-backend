import Result from "../models/result.js";

export const enterResult = async (req, res) => {
  try {
    const { exam, student, score, remarks } = req.body;

    const result = new Result({
      exam,
      student,
      teacher: req.user._id, // assuming teacher is logged in
      subject: req.body.subject,
      score,
      remarks,
    });

    await result.save();
    res.status(201).json({ message: "Result entered successfully", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStudentResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const results = await Result.find({ student: studentId })
      .populate("exam")
      .populate("teacher", "userId");

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
