import Config from "../models/config.js";


export const addFlutterwaveConfig =  async (req, res) => {
    try {

        const flutterwaveSecret = req.body.flutterwaveSecret;
        const flutterwavePublic = req.body.flutterwavePublic;
        const callbackUrl = req.body.callbackUrl;

        console.log({flutterwavePublic, flutterwaveSecret, callbackUrl});
        

        if(!flutterwaveSecret && !callbackUrl && !flutterwavePublic){
            return res.status(404).json({message:"flutterwave secret and callBack url is required"})
        }

      const newConfig = new Config({
        flutterwaveSecret: flutterwaveSecret,
        flutterwavePublic: flutterwavePublic,
        callbackUrl: callbackUrl,
      });

      await newConfig.save();
       

         res.status(200).json({
      message: "flutterwave secret and callback url updated successfully",
      newConfig,
    });
        
    } catch (error) {
        res.status(500).json({message: "Internal server error", error})
    }
}

export const addPaystackConfig =  async (req, res) => {
    try {

        const paystackSecret = req.body.paystackSecret;
        const paystackPublic = req.body.paystackPublic;
        const callbackUrl = req.body.callbackUrl;

        if(!paystackSecret && callbackUrl){
            return res.status(404).json({message:"paystack secret and callback url is required"})
        }

        const newConfig = new Config({
            paystackSecret: paystackSecret,
            paystackPublic: paystackPublic,
            callbackUrl: callbackUrl
        });

        await newConfig.save();

         res.status(200).json({
      message: "paystack secret and callback url updated successfully",
      newConfig,
    });
        
    } catch (error) {
        res.status(500).json({message: "Internal server error", error})
    }
};


export const getPaymentConfig = async (req, res) => {

    try {

        const configuration = await Config.findOne()

        if(!configuration){
            return res.status(404).json({message: "Configuration not found", success: false});
        };

        res.status(200).json({success: true, configuration})
        
    } catch (error) {
        res.status(500).json({message: "Internal server error"})
    }

};


export const updateFlutterwaveConfig = async (req, res)=>{

      try {
        const flutterwaveSecret = req.body.flutterwaveSecret;
        const flutterwavePublic = req.body.flutterwavePublic;
        const callbackUrl = req.body.callbackUrl;


        const existingConfig = await Config.findOne();

        if(existingConfig){

            existingConfig.flutterwaveSecret = flutterwaveSecret || existingConfig.flutterwaveSecret ;
        existingConfig.flutterwavePublic = flutterwavePublic || existingConfig.flutterwavePublic;
        existingConfig.callbackUrl = callbackUrl || existingConfig.callbackUrl ;

        await existingConfig.save()

        res.status(200).json({message: "Updated Successfully", success: true, existingConfig})

        }else{
            // Create new config if none exists
      const newConfig = new Config({
        flutterwaveSecret,
        flutterwavePublic,
        callbackUrl,
      });

      await newConfig.save();

      res.status(201).json({
        message: "Flutterwave config created successfully",
        success: true,
        config: newConfig,
      });
        }
        
      } catch (error) {
        res.status(500).json({message: "Internal server error", error})
      }
 

};

export const updatePaystackConfig = async (req, res) => {
  try {
    const paystackSecret = req.body.paystackSecret;
    const paystackPublic = req.body.paystackPublic;
    const callbackUrl = req.body.callbackUrl;

    const existingConfig = await Config.findOne();

    if (existingConfig) {
      existingConfig.paystackSecret = paystackSecret || existingConfig.paystackSecret;
      existingConfig.paystackPublic = paystackPublic || existingConfig.paystackPublic;
      existingConfig.callbackUrl = callbackUrl || existingConfig.callbackUrl;
      existingConfig.updatedAt = Date.now();

      await existingConfig.save();

      res.status(200).json({
        message: "Paystack config updated successfully",
        success: true,
        config: existingConfig,
      });
    } else {
      // Create new config if none exists
      const newConfig = new Config({
        paystackSecret,
        paystackPublic,
        callbackUrl,
      });

      await newConfig.save();

      res.status(201).json({
        message: "Paystack config created successfully",
        success: true,
        config: newConfig,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
