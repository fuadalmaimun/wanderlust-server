import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

// 1. Express server তৈরি করা

// express() দিয়ে server application তৈরি হয়।
const app = express();

// .env ফাইলে PORT থাকলে সেটি ব্যবহার হবে,
// না থাকলে default port হবে 5000।
const port = process.env.PORT || 5000;

// 2. Middleware setup

// CORS-এর কাজ হলো অন্য origin থেকে আসা
// frontend request গ্রহণ করতে সাহায্য করা।
// যেমন: Next.js frontend থেকে Express backend-এ request।
app.use(cors());

// express.json() JSON request body-কে JavaScript object-এ
// convert করে, যাতে আমরা req.body দিয়ে data পেতে পারি।
app.use(express.json());

// Backend Secure MiddleWare
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
  console.log(token);

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log("Verified token payload:", payload);
    return next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).json({
      msg: "Token verification failed",
    });
  }
};

// 3. MongoDB connection

// MongoClient দিয়ে MongoDB database-এর সঙ্গে
// connection তৈরি করার জন্য client বানানো হচ্ছে।
// MONGODB_URI .env ফাইল থেকে আসবে।
const client = new MongoClient(process.env.MONGODB_URI);

// MongoDB-তে connection করার জন্য function।
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

// 4. Database ও collection নির্বাচন

// MongoDB-তে connection করে client পাওয়া হচ্ছে।
const mongoClient = await connectToMongoDB();

// wanderlust নামের database নির্বাচন করা হচ্ছে।
const db = mongoClient.db("wanderlust");

// destinations collection নির্বাচন করা হচ্ছে।
// এখানে ভ্রমণের জায়গাগুলোর data রাখা হয়।
const destinationCollection = db.collection("destinations");

// bookings collection নির্বাচন করা হচ্ছে।
// এখানে user-এর booking-এর data রাখা হয়।
const userCollection = db.collection("bookings");

// ========================================
// 5. GET API: Server পরীক্ষা করা
// ========================================

// Browser-এ http://localhost:5000 খুললে
// server ঠিকমতো চলছে কি না বোঝার জন্য message পাঠায়।
app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});

// ========================================
// 6. GET API: সব destination পাওয়া
// ========================================

// GET /destinations
//
// কাজ:
// MongoDB থেকে সব destination-এর data নিয়ে
// frontend-এ পাঠানো।
app.get("/destinations", async (req, res) => {
  // find() দিয়ে সব document খোঁজা হচ্ছে।
  // toArray() দিয়ে ফলাফল array-তে নেওয়া হচ্ছে।
  const data = await destinationCollection.find().toArray();

  // পাওয়া data frontend-এ পাঠানো হচ্ছে।
  res.send(data);
});

// Featured API
app.get("/featured-destinations", async (req, res) => {
  const result = await destinationCollection.find().limit(5).toArray();
  res.send(result);
});

// ========================================
// 7. GET API: একটি নির্দিষ্ট destination পাওয়া
// ========================================

// GET /destinations/:id
//
// উদাহরণ:
// /destinations/671234567890123456789012
//
// এখানে :id হলো URL parameter।
// এই API একটি নির্দিষ্ট destination খুঁজে বের করে।
app.get("/destinations/:id", verifyToken, async (req, res) => {
  // URL থেকে destination-এর id নেওয়া হচ্ছে।
  const { id } = req.params;

  // MongoDB-এর _id সাধারণত ObjectId হয়।
  // তাই URL-এর string-কে ObjectId-তে convert করা হচ্ছে।
  // findOne() একটি matching document খুঁজে দেয়।
  const data = await destinationCollection.findOne({ _id: new ObjectId(id) });

  // পাওয়া destination frontend-এ পাঠানো হচ্ছে।
  res.json(data);
});

// ========================================
// 8. POST API: নতুন destination যোগ করা
// ========================================

// POST /add-destination
//
// কাজ:
// Frontend থেকে নতুন destination-এর data নিয়ে
// MongoDB-তে save করা।
app.post("/add-destination", verifyToken, async (req, res) => {
  // Frontend-এর পাঠানো request body থেকে data নেওয়া।
  const data = req.body;

  // insertOne() দিয়ে একটি নতুন document save করা।
  const result = await destinationCollection.insertOne(data);

  // Insert-এর result frontend-এ পাঠানো।
  res.send(result);
});

// ========================================
// 9. PUT API: Destination update করা
// ========================================

// PUT /destinations/:id
//
// কাজ:
// নির্দিষ্ট destination-এর data update করা।
app.put("/destinations/:id", verifyToken, async (req, res) => {
  // URL থেকে destination-এর id নেওয়া।
  const { id } = req.params;

  // Frontend থেকে নতুন data নেওয়া।
  const data = req.body;

  // যে destination-এর _id মিলে যাবে,
  // তার field-গুলো $set দিয়ে update করা হবে।
  const result = await destinationCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: data },
  );

  // Update-এর result frontend-এ পাঠানো।
  res.json(result);
});

// ========================================
// 10. DELETE API: Destination delete করা
// ========================================

// DELETE /destinations/:id
//
// কাজ:
// নির্দিষ্ট destination MongoDB থেকে delete করা।
app.delete("/destinations/:id", verifyToken, async (req, res) => {
  // URL থেকে destination-এর id নেওয়া।
  const { id } = req.params;

  // _id মিলিয়ে একটি destination delete করা।
  const result = await destinationCollection.deleteOne({
    _id: new ObjectId(id),
  });

  // Delete operation-এর result frontend-এ পাঠানো।
  res.send(result);
});

// ========================================
// 11. GET API: নির্দিষ্ট user-এর bookings পাওয়া
// ========================================

// GET /my-bookings/:email
//
// উদাহরণ:
// /my-bookings/fuad@example.com
//
// কাজ:
// URL-এ দেওয়া email-এর সঙ্গে মিলে যায়,
// এমন booking-গুলো MongoDB থেকে খুঁজে বের করা।
app.get("/my-bookings/:email", async (req, res) => {
  // URL parameter থেকে email নেওয়া।
  const { email } = req.params;

  // bookings collection-এ email field মিলিয়ে
  // সব matching booking খুঁজে বের করা।
  const data = await userCollection.find({ email: email }).toArray();

  // পাওয়া booking-গুলো frontend-এ পাঠানো।
  res.send(data);
});

// ========================================
// 12. DELETE API: একটি booking cancel করা
// ========================================

// DELETE /my-bookings/:id
//
// উদাহরণ:
// /my-bookings/671234567890123456789012
//
// কাজ:
// booking-এর _id দিয়ে একটি booking delete করা।
app.delete("/my-bookings/:id", async (req, res) => {
  // URL থেকে booking-এর id নেওয়া।
  const { id } = req.params;

  // MongoDB থেকে matching booking delete করা।
  const data = await userCollection.deleteOne({
    _id: new ObjectId(id),
  });

  // Delete result frontend-এ পাঠানো।
  res.send(data);
});

// ========================================
// 13. POST API: নতুন booking তৈরি করা
// ========================================

// POST /bookings
//
// কাজ:
// Book Now-তে click করার পর frontend থেকে
// booking-এর data গ্রহণ করে MongoDB-তে save করা।
app.post("/bookings", async (req, res) => {
  // Request body থেকে _id আলাদা করে নেওয়া হচ্ছে।
  // বাকি data-গুলো data variable-এ রাখা হচ্ছে।
  const { _id, ...data } = req.body;

  // bookings collection-এ নতুন booking save করা।
  const result = await userCollection.insertOne(data);

  // Insert-এর result frontend-এ পাঠানো।
  res.send(result);
});

// ========================================
// 14. Server চালু করা
// ========================================

// নির্ধারিত port-এ Express server চালু হয়।
app.listen(5000, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

export default app;
