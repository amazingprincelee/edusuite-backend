
import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

        const {fullname, phone, address, email, password, role} = req.body;

        const user = await User.findOne({
            $or: [
                {email: email},
                {phone: phone}
            ]
        })

        if(user){
           return res.status(400).json({message: "Already Existing user"})
        };


        const hashedPassword = await bcrypt.hash(password, saltRound);

        const newUser = new User({
            fullname: fullname,
            phone: phone,
            email: email, 
            address: address,
            password: hashedPassword,
            role: role
        });

        await newUser.save();

        res.status(201).json({message: "User Successfully Registered", newUser})
        
    } catch (error) {
        res.status(500).json({message: "Internal Server error", error})
    }


}