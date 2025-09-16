import ClassList from "../models/classList.js";

export const createClass = async (req, res) => {
  try {
    const { classLevel } = req.body;

    if (!classLevel || !classLevel.trim()) {
      return res.status(400).json({ message: "Class level is required" });
    }

    // check if class already exists
    const existingClass = await ClassList.findOne({ level: classLevel.trim() });
    if (existingClass) {
      return res.status(400).json({ message: "This class already exists" });
    }

    const newClass = new ClassList({ level: classLevel.trim() });
    await newClass.save();

    res.status(201).json({
      message: "Successfully created class",
      class: newClass,
    });
  } catch (err) {
    console.error("Error creating class:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Get all classes
export const getClass = async (req, res) => {
  try {
    const foundClass = await ClassList.find().sort({ createdAt: -1 }); // latest first

    if (!foundClass || foundClass.length === 0) {
      return res.status(404).json({ message: "No classes found" });
    }

    res.status(200).json({
      message: "Class list retrieved successfully",
      classes: foundClass,
    });
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Delete a class
export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClass = await ClassList.findByIdAndDelete(id);

    if (!deletedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.status(200).json({
      message: "Class deleted successfully",
      deletedClass,
    });
  } catch (err) {
    console.error("Error deleting class:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};