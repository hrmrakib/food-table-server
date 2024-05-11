const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;

// mongodb database connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.dmwxvyo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

    const batabase = client.db("foodTable");
    const userCollection = batabase.collection("users");
    const myFoodCollection = batabase.collection("myFoods");

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/allFood", async (req, res) => {
      const allFood = await myFoodCollection.find().toArray();
      res.send(allFood);
    });

    app.get("/single-food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myFoodCollection.findOne(query);
      res.send(result);
    });

    app.get("/my-added-food/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const cursor = myFoodCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/myFoods", async (req, res) => {
      const food = req.body;
      const result = await myFoodCollection.insertOne(food);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello server");
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
