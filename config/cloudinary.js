import "dotenv/config";
import {v2 as cloudinary} from "cloudinary";


cloudinary.config(
    {
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET
    }
);

export const isCloudinaryConnected = async () => {

    try {

      const response =  await cloudinary.api.ping();
      return response.status === "ok"
        
    } catch (error) {
        console.log("Cloudinary error, isCloudinatyConnected error", error.message);
        return false
        
    }

};



export const upload = async (file, folderName) => {

    try {
        const options = {
        folder: folderName,
        public_id: `${folderName}/${Date.now()}`
    }

  const image =  await cloudinary.uploader.upload(file, options)
    return image
        
    } catch (error) {
        console.log("cloudinary error", error);
        throw error
        
    }

    

}