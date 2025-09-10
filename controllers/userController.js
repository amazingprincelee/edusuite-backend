import User from "../models/user.js";
import {upload, isCloudinaryConnected } from "../config/cloudinary.js";
import bcrypt from "bcrypt";




export const userProfile = async (req, res)=>{

    try {

        res.status(200).json({
        success: true,
        user: req.user
    })
 
    } catch (error) {
        res.status(500).json({message: "server error"})
    }
 
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    console.log({oldPassword, newPassword});
    

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both old and new passwords are required" });
    }

    const user = req.user; 
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const dbUser = await User.findById(user._id).select("+password");
    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // check old password
    const isMatch = await bcrypt.compare(oldPassword, dbUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // hash new password
    const salt = await bcrypt.genSalt(10);
    dbUser.password = await bcrypt.hash(newPassword, salt);

    await dbUser.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};


export const updateProfile = async (req, res) => {

   
  try {

    const {
      fullname,
      email, 
      address,
    } = req.body;

    console.log({fullname, email, address});
    

    const user = req.user

    if(!user){
      return res.status(404).json({message: "user not found"})
    }

    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.address = address || user.address;

  

    await user.save();

    res.status(200).json({message: "user profile updated successfully", user})
    
  } catch (error) {
    res.status(500).json({message: "Internal server error", error})
  }

}



export const uploadImage = async (req, res) => {
  try {
     const userId = req.user._id;
     const { image } = req.files;
     const fileTypes = ["image/jpeg", "image/png", "image/jpg"];
     const imageSize = 1024;
 
    if(image){

      if (!fileTypes.includes(image.mimetype)) {
        return res
          .status(400)
          .json({ success: false, error: "image should be jpeg, jpg or png" });
      }

    }else{
      return res.status(400).json({message: "image file error"})
    }

    //Validate image size
      if (image.size / 1024 > imageSize) {
        return res
          .status(400)
          .json({
            success: false,
            error: `Image size should not be greater than ${imageSize}`,
          });
      }
    

     const user = await User.findById(userId);     

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


     const isConnected = await isCloudinaryConnected();
    if (!isConnected) {
      return res.status(400).json({message:"Cloudinary is not reachable. Check your internet or credentials."});
    }

     const imageUrl = await upload(image.tempFilePath, user._id);

     if (!imageUrl) {
      return res.status(500).json({ message: "Image upload failed" });
    }
     
     user.profilePhoto = imageUrl.secure_url; 
     await user.save();

    res
      .status(200)
      .json({
        message: "Successfully uploaded user photo image",
        profilePhoto: user.profilePhoto
      });

  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
