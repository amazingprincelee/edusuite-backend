import mongoose from "mongoose";


const schoolInfoSchema = new mongoose.Schema({
    schoolName: {type: String},
    schoolLogo: {type: String, default: null},
    schoolDescription: {type: String},
    schoolAddress: {type: String},
    schoolMotto: {type: String},
    photoGallery: [{type: String}],
    state: {type: String},
    country: {type: String},
    createdat: {type: Date, default: Date.now()}
});


const SchoolInfo = mongoose.model('SchoolInfo', schoolInfoSchema);

export default SchoolInfo;