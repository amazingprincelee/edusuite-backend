import ClassList from "../models/class.js"


export const createClass = async (req, res)=>{

   const { classLevel } = req.body

   const existingClass = await ClassList.find({level: classLevel});

   if(existingClass){
    res.status(400).json({message: "This class already exist"})
   }

   const newClass = new ClassList({
    level: classLevel
   })

   newClass.save();

   res.status(200).json({message: "Successfully created class"}, newClass)

}

export const getClass = async ( req, res) => {

    const foundClass = await ClassList.find();

    if(!foundClass){
        res.status(404).json({message: "Class List not found"})
    }

    res.status(200).json({message: "ClassList found", foundClass})

}