

export const isAdmin = async (req, res, next) => {
    try {

        const user = req.user

        if(user.role !== "admin"){
            res.status(401).json({message: "Unauthorised"})
        }

        next();
        
    } catch (error) {
        res.status(500).json({message: "Internal server error - admin middleware", error})
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