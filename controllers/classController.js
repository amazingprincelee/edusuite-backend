import ClassList from "../models/class.js"


export const createClass = async (req, res) => {
  try {
    const { classLevel } = req.body;

    const existingClass = await ClassList.findOne({ level: classLevel });
    console.log("Existing class:", existingClass);

    if (existingClass) {
      return res.status(400).json({ message: "This class already exists" });
    }

    const newClass = new ClassList({ level: classLevel });
    await newClass.save();

    res.status(200).json({
      message: "Successfully created class",
      newClass
    });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err });
  }
};


export const getClass = async ( req, res) => {

    const foundClass = await ClassList.find();

    if(!foundClass){
        res.status(404).json({message: "Class List not found"})
    }

    res.status(200).json({message: "ClassList found", foundClass})

}