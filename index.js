import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

// Connect to MongoDB send data
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("wanderlust");
const destinationCollection = db.collection("destinations");


app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});


// এই code-এর কাজ হলো MongoDB থেকে সব destination-এর data নিয়ে frontend-এ পাঠানো।

app.get("/destinations", async (req, res) => {
  const data = await destinationCollection.find().toArray();
  res.send(data);
});



//এই API-এর কাজ হলো MongoDB থেকে একটি নির্দিষ্ট destination খুঁজে বের করে frontend-এ পাঠানো। 

app.get("/destinations/:id", async (req, res) => {
  const {id} = req.params;
  const data = await destinationCollection.findOne({ _id: new ObjectId(id) });
  res.send(data);
});

app.post("/add-destination", async (req, res) => {
  const data = req.body;
  const result = await destinationCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

// Edit a destination
app.put('/destinations/:id', async (req, res) => {
  const {id} = req.params;
  const data = req.body;
  const result = await destinationCollection.updateOne(
    {_id: new ObjectId(id)},
    {$set: data}
  )
  res.json(result);
})

// Delete
app.delete('/destinations/:id', async (req, res) => {
  const {id} = req.params;
  const data = req.body;
  const result = await destinationCollection.deleteOne(
    {_id: new ObjectId(id)},
  
  )
  res.json(result);
})

app.listen(5000, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
