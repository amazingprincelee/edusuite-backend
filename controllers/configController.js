import Config from "../models/config.js";


export const addFlutterwaveConfig =  async (req, res) => {
    try {

        const flutterwaveSecret = req.body.flutterwaveSecret;
        const flutterwavePublic = req.body.flutterwavePublic;
        const webhookUrl = req.body.webhookUrl;

        console.log({flutterwavePublic, flutterwaveSecret, webhookUrl});
        

        if(!flutterwaveSecret && !webhookUrl && !flutterwavePublic){
            return res.status(404).json({message:"flutterwave secret and webhook url is required"})
        }

      const newConfig = new Config({
        flutterwaveSecret: flutterwaveSecret,
        flutterwavePublic: flutterwavePublic,
        webhookUrl: webhookUrl,
      });

      await newConfig.save();
       

         res.status(200).json({
      message: "flutterwave secret and webhook url updated successfully",
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

        if(!paystackSecret){
            return res.status(404).json({message:"paystack secret is required"})
        }

        const newConfig = new Config({
            paystackSecret: paystackSecret,
            paystackPublic: paystackPublic
        });

        await newConfig.save();

         res.status(200).json({
      message: "paystack secret updated successfully",
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


        const existingConfig = await Config.findOne();

        if(existingConfig){

            existingConfig.flutterwaveSecret = flutterwaveSecret || existingConfig.flutterwaveSecret ;
        existingConfig.flutterwavePublic = flutterwavePublic || existingConfig.flutterwavePublic;

        await existingConfig.save()

        res.status(200).json({message: "Updated Successfully", success: true, existingConfig})

        }else{
            // Create new config if none exists
      const newConfig = new Config({
        flutterwaveSecret,
        flutterwavePublic,
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

    const existingConfig = await Config.findOne();

    if (existingConfig) {
      existingConfig.paystackSecret = paystackSecret || existingConfig.paystackSecret;
      existingConfig.paystackPublic = paystackPublic || existingConfig.paystackPublic;
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

export const updateActivePaymentGateway = async (req, res) => {
  try {
    const { activePaymentGateway } = req.body;

    // Validate the gateway value
    if (!activePaymentGateway || !['flutterwave', 'paystack'].includes(activePaymentGateway)) {
      return res.status(400).json({
        message: "Invalid payment gateway. Must be 'flutterwave' or 'paystack'",
        success: false,
      });
    }

    const existingConfig = await Config.findOne();

    if (existingConfig) {
      existingConfig.activePaymentGateway = activePaymentGateway;
      existingConfig.updatedAt = Date.now();

      await existingConfig.save();

      res.status(200).json({
        message: "Active payment gateway updated successfully",
        success: true,
        config: existingConfig,
      });
    } else {
      // Create new config if none exists
      const newConfig = new Config({
        activePaymentGateway,
      });

      await newConfig.save();

      res.status(201).json({
        message: "Active payment gateway config created successfully",
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
