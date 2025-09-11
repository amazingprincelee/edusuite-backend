import User from "../models/user.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const isAuthenticated = async (req, res, next) => {

    try {

     const authHeader = req.headers["authorization"];

    if(!authHeader){
        return res.status(401).json({message: "No token founds"});
    };

    // get token
    const token = authHeader.split(" ")[1];

    if(!token){
        return res.status(401).json({message: "invalid token format"})
    };

    //decode token
    const decoded = jwt.verify(token, JWT_SECRET)

    //get the user
    const user = await User.findById(decoded.id).select("-password");
    
    req.user = user;

    next()
        
    } catch (error) {
        if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Internal server error" }); 
    }

}