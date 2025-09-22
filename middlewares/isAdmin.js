

export const isAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    console.log("Admin middleware - User:", user ? `${user.fullname} (${user.role})` : "No user");
    
    if (!user) {
      console.log("Admin middleware - No user found");
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const allowedRoles = ["admin", "superadmin"];
    console.log("Admin middleware - User role:", user.role, "Allowed roles:", allowedRoles);

    if (!allowedRoles.includes(user.role)) {
      console.log("Admin middleware - Role not authorized:", user.role);
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("Admin middleware - Access granted");
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res
      .status(500)
      .json({ message: "Internal server error - admin middleware", error });
  }
};



export const isSuperAdmin = async (req, res, next) => {
    try {

        const user = req.user

        if(user.role !== "superadmin"){
            return res.status(401).json({message: "Unauthorised"})
        }

        next();
        
    } catch (error) {
        res.status(500).json({message: "Inter server error - Super Admin middleware", error})
    }
};