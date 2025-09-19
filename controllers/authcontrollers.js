
import User from "../models/user.js";
import Teacher from "../models/teachers.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendUserCredentials } from "../utils/node-mailer.js";

const saltRound = 10
const JWT_SECRET =  process.env.JWT_SECRET;




export const login = async (req, res)=> {

    try {

        let { username, password } = req.body;
        
        //remove extra space and bring down to lowercase
        username = username.trim().toLowerCase();

       
        

        const user = await User.findOne({$or: [{phone: username}, {email: username}]});
        

        if(!user){
           return res.status(400).json({message: "Incorrect username or password"})
        }

       const isMatched = await bcrypt.compare(password, user.password)

       if(isMatched){
         
         const token = jwt.sign({id: user._id, role: user.role}, JWT_SECRET, {expiresIn: 60 * 60 * 24 * 7});
         return res.status(200).json({success: true, message: "login successfully", token, role: user.role})

       }else{
        
        return res.status(401).json({message: "password is incorrect"});
        
       }
        
    } catch (error) {
        res.status(500).json({message: "Internal server error", error})
    }
 };


export const register = async (req, res) => {

    try {

        const {fullname, phone, address, email, password, role, gender, 
               // Teacher-specific fields
               salary, designation, subjects, status, bankName, bankAccount, accountName} = req.body;

        const user = await User.findOne({
            $or: [
                {email: email},
                {phone: phone}
            ]
        })

        if(user){
           return res.status(400).json({message: "Already Existing user"})
        };

        let generatedPassword = null;
        let emailSent = false;

        // Store plain password for teachers and parents to send via email
        if (role === "parent" || role === "teacher") {
            generatedPassword = password;
            
            try {
                const userData = { fullname, phone, email, address, gender, role };
                await sendUserCredentials(userData, password);
                emailSent = true;
                
                console.log(`Credentials email sent to ${role} ${fullname}: Success`);
            } catch (emailError) {
                console.error(`Failed to send welcome email to ${role}:`, emailError);
                emailSent = false;
                // Continue with registration even if email fails
            }
        }

        const hashedPassword = await bcrypt.hash(password, saltRound);

        // Prepare user data
        const userData = {
            fullname: fullname,
            phone: phone,
            email: email, 
            address: address,
            gender: gender,
            password: hashedPassword,
            generatedParentPassword: generatedPassword, // Store for both teachers and parents
            role: role
        };

        // Add teacher-specific fields if role is teacher
        if (role === 'teacher') {
            if (salary) userData.salary = salary;
            if (designation) userData.designation = designation;
            if (subjects) {
                // Handle subjects as array or comma-separated string
                userData.subjects = Array.isArray(subjects) 
                    ? subjects 
                    : subjects.split(',').map(s => s.trim()).filter(s => s);
            }
        }

        const newUser = new User(userData);

        await newUser.save();

        // Create Teacher record if role is teacher
        let teacherRecord = null;
        if (role === 'teacher') {
            const teacherData = {
                userId: newUser._id,
                status: status || 'full time' // Default to full time if not provided
            };

            // Add bank details if provided (check for non-empty values)
            if (bankName || bankAccount || accountName) {
                teacherData.bankDetails = {
                    bankName: bankName || '',
                    bankAccount: bankAccount || '',
                    accountName: accountName || ''
                };
            }

            teacherRecord = new Teacher(teacherData);
            await teacherRecord.save();
        }

        // Prepare response based on role
        const response = {
            message: "User Successfully Registered",
            newUser: {
                _id: newUser._id,
                fullname: newUser.fullname,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                address: newUser.address,
                gender: newUser.gender,
                createdAt: newUser.createdAt,
                // Include teacher-specific fields if role is teacher
                ...(role === 'teacher' && {
                    salary: newUser.salary,
                    designation: newUser.designation,
                    subjects: newUser.subjects,
                    teacherInfo: teacherRecord ? {
                        _id: teacherRecord._id,
                        status: teacherRecord.status,
                        bankDetails: teacherRecord.bankDetails
                    } : null
                })
            }
        };

        // Add role-specific information to response for teachers and parents
        if (role === 'parent' || role === 'teacher') {
            response.credentialsInfo = {
                plainPassword: generatedPassword,
                welcomeEmailSent: emailSent
            };
            response.message = emailSent 
                ? `${role.charAt(0).toUpperCase() + role.slice(1)} successfully registered and welcome email sent with login credentials`
                : `${role.charAt(0).toUpperCase() + role.slice(1)} successfully registered with credentials (email sending failed)`;
        }

        res.status(201).json(response);
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({message: "Internal Server error", error: error.message})
    }


}