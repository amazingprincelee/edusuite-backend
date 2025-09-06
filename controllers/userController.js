




export const userProfile = async (req, res)=>{

    try {

        res.status(200).json({
        success: true,
        user: req.user
    })
 
    } catch (error) {
        res.status(500).json({message: "server error"})
    }
 
};