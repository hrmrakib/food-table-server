const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://food-table-restaurant.web.app",
      "https://food-table-restaurant.firebaseapp.com",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(cookieParser());

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const batabase = client.db("foodTable");
    const userCollection = batabase.collection("users");
    const myFoodCollection = batabase.collection("myFoods");
    const orderCollection = batabase.collection("orders");
    const galleryCollection = batabase.collection("gallery");

    // verify token
    const verifyToken = (req, res, next) => {
      const token = req?.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.user = decoded;
        next();
      });
    };

    // jwt (To set cookie)
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // clear cookie
    app.post("/logout", (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/allFood", async (req, res) => {
      const allFood = await myFoodCollection.find().toArray();
      res.send(allFood);
    });

    // get top 6 selling food
    app.get("/top-selling", async (req, res) => {
      const result = await myFoodCollection
        .find()
        .sort({ orderCount: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // single food for view detail pages
    app.get("/single-food/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myFoodCollection.findOne(query);
      res.send(result);
    });

    // added food by user email
    app.get("/my-added-food/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { userEmail: email };
      const cursor = myFoodCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // find userEmail based on added food item
    app.get("/findEmail/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myFoodCollection.findOne(query);
      res.send(result);
    });

    app.post("/myFoods", async (req, res) => {
      const food = req.body;
      const result = await myFoodCollection.insertOne(food);
      res.send(result);
    });

    app.delete("/delete-order-food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // store order food
    app.post("/orderFood", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    app.get("/my-ordered-food/:email", verifyToken, async (req, res) => {
      // const tokenEmail = req.user.email;
      const email = req.params.email;
      // if (tokenEmail !== email) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { buyerEmail: email };
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/find-exist-order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { foodId: id };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    // increase orderCount
    app.post("/increaseOrderCount/:id", (req, res) => {
      try {
        const foodId = req.params.id;

        const result = myFoodCollection.updateOne(
          { _id: new ObjectId(foodId) },
          { $inc: { orderCount: 1 } }
        );
        if (result.modifiedCount === 0) {
          res.status(404).send({ message: "Food item is not found!" });
        }

        res.send("Order successfully increase!");
      } catch (error) {
        res.status(500).send({ error: "Internal server error!" });
      }
    });

    app.get("/search-food", async (req, res) => {
      const { foodName } = req.query;
      try {
        const food = await myFoodCollection
          .find({
            foodName: { $regex: foodName, $options: "i" },
          })
          .toArray();
        // res.json(food);
        res.send(food);
      } catch (error) {
        res.status(500).send({ error: "Internal server error!" });
      }
    });

    // gallery
    app.get("/gallery", async (req, res) => {
      try {
        const result = await galleryCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error });
      }
    });

    // save gallery
    app.post("/gallery", async (req, res) => {
      const gallery = req.body;
      const result = await galleryCollection.insertOne(gallery);
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
