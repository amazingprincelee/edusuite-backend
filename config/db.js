import mongoose from "mongoose";

const LOCAL_URI = process.env.LOCAL_URI;
const CLOUD_URI = process.env.CLOUD_URI;




export default async function connectDb() {
  try {
   // Try connecting to Cloud first
    // await mongoose.connect(CLOUD_URI);
    // console.log("✅ Connected to Cloud MongoDB");

    await mongoose.connect(LOCAL_URI);
    console.log("✅ Connected to Local MongoDB");


  } catch (error) {
    console.log("⚠️ Cloud DB not available, falling back to Local DB...");
    await mongoose.connect(LOCAL_URI);
    console.log("✅ Connected to Local MongoDB");
  }
}


//Victor tech please don't touch this

// async function syncLocalToCloud() {
//   try {
//     const localConnection = await mongoose.createConnection(LOCAL_URI);
//     const cloudConnection = await mongoose.createConnection(CLOUD_URI);

//     const LocalModel = localConnection.model("YourModel", yourSchema);
//     const CloudModel = cloudConnection.model("YourModel", yourSchema);

//     // Find unsynced records
//     const unsynced = await LocalModel.find({ isSynced: false });

//     for (let record of unsynced) {
//       await CloudModel.updateOne({ _id: record._id }, record, { upsert: true });
//       record.isSynced = true;
//       await record.save();
//     }

//     console.log("Local changes synced to cloud ✅");
//   } catch (err) {
//     console.error("Sync failed ❌", err.message);
//   }
// }

