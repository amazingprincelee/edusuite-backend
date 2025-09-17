import SchoolInfo from "../models/schoolInformation.js";
import {upload, isCloudinaryConnected, deleteFromCloudinary} from "../config/cloudinary.js"


export const addInformation = async (req, res)=>{

    try {
         const {
    schoolName,
    schoolDescription,
    schoolAddress,
    schoolMotto,
    state,
    country,
    } = req.body;

    const newSchoolInfo = new SchoolInfo({
    schoolName: schoolName,
    schoolDescription: schoolDescription,
    schoolAddress: schoolAddress,
    schoolMotto: schoolMotto,
    state: state,
    country: country
    });

    await newSchoolInfo.save();

    res.status(200).json({message: "New school Information saved Successfully", newSchoolInfo})
        
    } catch (error) {
        res.status(500).json({message: "Internal server error"});
    }
    
};

export const deleteSchoolInfo = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    
    const deletedSchoolInfo = await SchoolInfo.findByIdAndDelete(schoolId);
    
    if (!deletedSchoolInfo) {
      return res.status(404).json({ message: "School information not found" });
    }
    
    // If there's a school logo, delete it from Cloudinary too
    if (deletedSchoolInfo.schoolLogo) {
      try {
        await deleteFromCloudinary(deletedSchoolInfo.schoolLogo);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
      }
    }
    
    res.status(200).json({ message: "School information deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



export const getSchoolInfo = async (req, res)=>{

    try {

        const schoolInfo = await SchoolInfo.findOne();

        res.status(200).json({message: "Found School Information", schoolInfo})
        
    } catch (error) {
         res.status(500).json({message: "Internal server error"});
    }
}

export const updateSchoolInfo = async (req, res) => {

    try {

        const schoolId = req.params.schoolId;

        console.log(schoolId);
        

         const {
    schoolName,
    schoolDescription,
    schoolAddress,
    schoolMotto,
    state,
    country
    } = req.body;

    console.log({schoolAddress, schoolName, schoolDescription, schoolMotto, state, country});
    

    if(schoolId){

        const existingSchoolInfo = await SchoolInfo.findById(schoolId);

        
              existingSchoolInfo.schoolName || schoolName;
              existingSchoolInfo.schoolDescription || schoolDescription;
              existingSchoolInfo.schoolAddress || schoolAddress;
              existingSchoolInfo.schoolMotto || schoolMotto;
              existingSchoolInfo.state || state;
              existingSchoolInfo.country || country;
        

              await existingSchoolInfo.save()

        

        res.status(200).json({message: 'school information updated successfully', existingSchoolInfo})

    }else{
      return res.status(400).json({message: "Please enter School Id"})
    }
        
    } catch (error) {
        res.status(500).json({message: "Internal server error", error})
    }

    
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const { image } = req.files;
    const fileTypes = ["image/jpeg", "image/png", "image/jpg"];
    const imageSize = 1024; // KB limit

    // validate type
    if (!fileTypes.includes(image.mimetype)) {
      return res.status(400).json({
        success: false,
        error: "Image should be jpeg, jpg, or png",
      });
    }

    // validate size
    if (image.size / 1024 > imageSize) {
      return res.status(400).json({
        success: false,
        error: `Image size should not be greater than ${imageSize} KB`,
      });
    }

    // check Cloudinary
    const isConnected = await isCloudinaryConnected();
    if (!isConnected) {
      return res.status(400).json({
        message: "Cloudinary is not reachable. Check your internet or credentials.",
      });
    }

    // upload to cloudinary
    const imageUrl = await upload(image.tempFilePath, "school_logo");
    if (!imageUrl) {
      return res.status(500).json({ message: "Image upload failed" });
    }

    // update or create school record
    const school = await SchoolInfo.findOneAndUpdate(
      {},
      { schoolLogo: imageUrl.secure_url },
      { new: true, upsert: true } // upsert ensures a record is created if none exists
    );

    res.status(200).json({
      message: "Successfully uploaded school logo",
      school,
    });
  } catch (error) {
    console.error(error); // log for debugging
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const deleteSchoolLogo = async (req, res) => {
  try {
    const school = await SchoolInfo.findOne();

    if (!school || !school.schoolLogo) {
      return res.status(404).json({ message: "School logo not found" });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(school.schoolLogo);

    // Remove from database
    school.schoolLogo = undefined;
    await school.save();

    res.status(200).json({ message: "School logo deleted successfully" });
  } catch (error) {
    console.error("Delete school logo error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



export const uploadGallery = async (req, res) => {
  try {
    if (!req.files || !req.files.images) {
      return res.status(400).json({ message: "No gallery images provided" });
    }

    const fileTypes = ["image/jpeg", "image/png", "image/jpg"];
    const imageSize = 1024;

    // normalize array
    const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    const uploadedUrls = [];

    const isConnected = await isCloudinaryConnected();
    if (!isConnected) {
      return res.status(400).json({
        message: "Cloudinary is not reachable. Check your internet or credentials.",
      });
    }

    for (const image of images) {
      if (!fileTypes.includes(image.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `${image.name} should be jpeg, jpg, or png`,
        });
      }

      if (image.size / 1024 > imageSize) {
        return res.status(400).json({
          success: false,
          error: `${image.name} size should not be greater than ${imageSize} KB`,
        });
      }

      const imageUrl = await upload(image.tempFilePath, "school_gallery");
      if (!imageUrl) {
        return res.status(500).json({ message: `Failed to upload ${image.name}` });
      }

      uploadedUrls.push(imageUrl.secure_url);
    }

    // push into gallery
    const school = await SchoolInfo.findOneAndUpdate(
      {},
      { $push: { photoGallery: { $each: uploadedUrls } } },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "Successfully uploaded gallery images",
      uploadedUrls,
      school,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error });
  }
};




export const getGallery = async (req, res) => {
  try {
    const school = await SchoolInfo.findOne();
    
    if (!school || !school.photoGallery) {
      return res.status(200).json({ photoGallery: [] });
    }
    
    res.status(200).json({ photoGallery: school.photoGallery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const deleteGalleryImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }
    
    const school = await SchoolInfo.findOne();
    
    if (!school || !school.photoGallery || school.photoGallery.length === 0) {
      return res.status(404).json({ message: "Gallery image not found" });
    }
    
    // Check if image exists in gallery
    const imageIndex = school.photoGallery.indexOf(imageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({ message: "Gallery image not found" });
    }
    
    // Delete from Cloudinary
    await deleteFromCloudinary(imageUrl);
    
    // Remove from array
    school.photoGallery.splice(imageIndex, 1);
    await school.save();
    
    res.status(200).json({ message: "Gallery image deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};