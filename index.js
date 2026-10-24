import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

// Send all destinations
app.get("/destinations", async (req, res) => {
  const data = await destinationCollection.find().toArray();
  res.send(data);
});

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

app.listen(5000, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
