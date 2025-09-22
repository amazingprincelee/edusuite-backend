import User from "../models/user.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const isAuthenticated = async (req, res, next) => {
     
     
    try {

     const authHeader = req.headers["authorization"];
     console.log("Auth header:", authHeader);

    if(!authHeader){
        console.log("No authorization header found");
        return res.status(401).json({message: "No token founds"});
    };

    // get token
    const token = authHeader.split(" ")[1];
    console.log("Extracted token:", token ? "Token present" : "No token");

    
    

    if(!token){
        console.log("Invalid token format");
        return res.status(401).json({message: "invalid token format"})
    };

    //decode token
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log("Decoded token user ID:", decoded.id);

    //get the user
    const user = await User.findById(decoded.id).select("-password");
    console.log("Found user:", user ? `${user.fullname} (${user.role})` : "No user found");
    
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