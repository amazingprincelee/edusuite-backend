import {v2 as cloudinary} from "cloudinary";
import { date } from "yup";

cloudinary.config(
    {
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET
    }
)



export const upload = async (file, folderName) => {

    const option = {
        folder: folderName,
        public_id: `${folderName}/${Date.now()}`
    }

  const image =  await cloudinary.uploader.upload(file, option)
    return image

}