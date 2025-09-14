import mongoose from "mongoose";



const classSchema = new mongoose.Schema({
    level: { type: String, required: true, unique: true },
    order: { type: Number, required: true }, // For proper sequencing
    section: { type: String }, // e.g., "Nursery", "Primary", "Secondary"
    isGraduatingClass: { type: Boolean, default: false }, // Mark final classes
    createdAt: { type: Date, default: Date.now }
});

// Ensure unique ordering
classSchema.index({ order: 1 }, { unique: true });

const ClassList = mongoose.model("ClassList", classSchema);
export default ClassList;