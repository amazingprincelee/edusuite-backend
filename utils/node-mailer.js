import {config} from "dotenv"
import nodemailer from "nodemailer";
config()







 export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

transporter.verify((err, success)=>{
    if(err){
        console.log('nodemailer transporter Verification error ',err);
        
    }else if (success){
        console.log('nodemailer transporter Verification success', success);
        
    }
});

export function sendVerificationCode (to, code){
    const mailOption={
        from: '"Bedetels" <nnavictor727@gmail.com>',
        to,
        subject: `${code} is your verification code`,
        text: `Dear User, \n\n Your verification code is ${code} \n\n Thanks for registering, for further enquires, please contact school management:\n phone: 08035442001`
    }

    return transporter.sendMail(mailOption)

}