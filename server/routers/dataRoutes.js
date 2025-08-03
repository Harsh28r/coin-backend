import express from 'express';

const router = express.Router();

export default (db) => {
  // Route to receive data from the frontend
  router.post('/store', async (req, res) => {
    const dataToStore = req.body; // Get the data sent from the frontend

    try {
      // Store the data in the 'rssfeeds' collection
      const result = await db.collection('rssfeeds').insertOne(dataToStore);
      res.status(201).json({ success: true, data: result.ops[0] }); // Respond with the stored data
    } catch (error) {
      console.error("Error storing data:", error);
      res.status(500).json({ success: false, message: "Error storing data", error: error.message });
    }
  });

  return router;
};
