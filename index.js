// git add .
// git commit -m " added provateRout Dashboard"
//  git push
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
// middleware
app.use(cors({ origin: "http://localhost:5173", optionSuccessStatus: 200 }));
app.use(express.json());
// token verification
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ message: "No Token" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (err, decode) => {
    if (err) {
      return res.send({ message: "Invalid Token" });
    }
    req.decode = decode;
    next();
  });
};
// seller varification
const verifySellarToken = async (req, res, next) => {
  const email = req.decode.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user?.role !== "seller") {
    return res.send({ message: "Forbuden Access" });
  }
  next();
};
// mongodb
// const  uri = "mongodb+srv://GADGET:DWXqcOaDqMD0w5b0@cluster0.63qrdth.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.63qrdth.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const userCollection = client.db("gadgetShop").collection("users");
const productsCollection = client.db("gadgetShop").collection("products");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // get user
    app.get("/user/:email", async (req, res) => {
      const query = { email: req.params.email };
      const user = await userCollection.findOne(query);
      if (!user) {
        return res.send({ message: "No user found" });
      }
      res.send(user);
    });
    //post users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existEmail = await userCollection.findOne(query);
      if (existEmail) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // add products
    app.post(
      "/add-products",
      verifyJWT,
      verifySellarToken,
      async (req, res) => {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        res.send(result);
      }
    );
    // All Get Products
    // name searching
    // sort by price
    // filter by category
    // filter by brand
    app.get("/all-products", async (req, res) => {
      const {
        title,
        sort,
        category: categoryFilter,
        brand: brandFilter,
        page = 1,
        limit = 9,
      } = req.query;
      const query = {};
      if (title) {
        query.title = { $regex: title, $options: "i" };
      }
      if (categoryFilter) {
        query.category = { $regex: categoryFilter, $options: "i" };
      }
      if (brandFilter) {
        query.brand = brandFilter;
      }
      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      const sortOption = sort === "asc" ? 1 : -1;
      const products = await productsCollection
        .find(query)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .sort({ price: sortOption })
        .toArray();
      const totalProodacts = await productsCollection.countDocuments(query);

      const productInfo = await productsCollection
        .find({}, { projection: { category: 1, brand: 1 } })
        .toArray();
      const categoryList = [
        ...new Set(productInfo.map((product) => product.category)),
      ];
      const brandList = [
        ...new Set(productInfo.map((product) => product.brand)),
      ];

      res.json({
        products,
        brand: brandList,
        category: categoryList,
        totalProodacts,
      });
    });
    // add to wish list

    app.patch("/wishList/add", async (req, res) => {
      const { userEmail, productId } = req.body;
      const result = await userCollection.updateOne(
        { email: userEmail },
        { $addToSet: { wishList: new ObjectId(String(productId)) } }
      );
      res.send(result);
    });

    // get data from wish lish
    app.get("/wishList/:userId", verifyJWT, async (req, res) => {
     
        const userId = req.params.userId; 
        const user = await userCollection.findOne({
          _id: new ObjectId(userId),
        });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        const wishList = await productsCollection
          .find({ _id: { $in: user.wishList || [] } })
          .toArray();
        res.status(200).send(wishList);
      
    });
    // remove from wishList 
    app.delete("/wishList/remove", async (req, res) => {
      const { userEmail, productId } = req.body;
      const result = await userCollection.updateOne(
          { email: userEmail },
          { $pull: { wishList: new ObjectId(String(productId)) } }
      );
      res.send(result);
  });
  
    

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// api
app.get("/", (req, res) => {
  res.send("server is running by gadget shop");
});
// jwt
app.post("/authentication", (req, res) => {
  const useEmail = req.body;
  const token = jwt.sign(useEmail, process.env.ACCESS_KEY_TOKEN, {
    expiresIn: "10d",
  });
  res.send({ token });
});
app.listen(port, () => {
  console.log(`server is running by gadget shop on port, ${port}`);
});
