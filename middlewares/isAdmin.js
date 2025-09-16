

export const isAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const allowedRoles = ["admin", "superadmin"];

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    next();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error - admin middleware", error });
  }
};



export const isSuperAdmin = async (req, res, next) => {
    try {

        const user = req.user

        if(user.role !== "superadmin"){
            res.status(401).json({message: "Unauthorised"})
        }

        next();
        
    } catch (error) {
        res.status(500).json({message: "Inter server error - Super Admin middleware", error})
    }
};