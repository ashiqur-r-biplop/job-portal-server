require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// middleware
app.use(cors());
app.use(express.json());
const username = process.env.USER_NAME;
const password = process.env.PASSWORD;

const uri = `mongodb+srv://${username}:${password}@cluster0.klmvqmu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization);
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];
  // console.log(token);
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access2" });
    }

    req.decoded = decoded;
    next();
  });
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const userCollection = client.db("job-portal").collection("users");
    const jobsCollection = client.db("job-portal").collection("jobs");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      // console.log(email);
      const query = { email: email };
      // console.log(query);
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    // student
    const verifyHiringManager = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      // console.log(query);
      const user = await userCollection.findOne(query);
      // console.log(user);
      if (user?.role !== "hiringManager") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    // instructor
    const verifyJobSeeker = async (req, res, next) => {
      const email = req.decoded;
      // console.log(email);
      const query = { email: email.email };
      // console.log(query, "email");
      const user = await userCollection.findOne(query);
      // console.log(user);
      if (user?.role !== "jobSeeker") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    //User Create:
    app.post("/user", async (req, res) => {
      try {
        const user = req.body;
        // console.log(user);
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "user already exists" });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // User Role
    app.get("/user-role/:email", verifyJWT, async (req, res) => {
      try {
        const email = req.params.email;
        const findUser = await userCollection.findOne({ email: email });
        res.send({
          userRole: findUser.userRole,
        });
      } catch (error) {
        console.log(error);
      }
    });

    // User Role Update:(dev-akash)
    app.put('/update-user/:id', async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      console.log(updateStatus.body);
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      // create a document that sets the plot of the movie
      if (user.userRole === 'admin') {
        const updateDoc = {
          $set: {
            userRole: 'admin'
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.json(result)
      }
      else if (user.userRole === 'hiringManager') {
        const updateDoc = {
          $set: {
            userRole: 'hiringManager'
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.json(result)
      }
    });

    // Load All Users: (dev-akash)
    app.get('/user', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // Load Single User: (dev-akash)
    app.get('/user/:id', async (req, res) => {
      const id = req.params.id;
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      res.send(user);
    })

    // User Delete Method: (dev-akash)
    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id;
      const deleteUser = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(deleteUser);
      if (result.deletedCount) {
        res.send(result)
      }
      else {
        res.send({ message: 'Something Went Wrong!' })
      }
    })

    // Job Post: (dev-akash)
    app.post("/job-post", async (req, res) => {
      try {
        const body = req.body;
        const jobs = {
          ...body,
          status: "pending",
        };
        const result = await jobsCollection.insertOne(jobs);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Get All Job Post: (dev-akash)
    app.get('/job-post', async (req, res) => {
      const allJobPost = jobsCollection.find();
      const result = await allJobPost.toArray();
      res.send(result);
    })

    // Load Single Job: (dev-akash)
    app.get('/job-post/:id', async (req, res) => {
      const id = req.params.id;
      const singleJob = await jobsCollection.findOne({ _id: new ObjectId(id) });
      res.send(singleJob);
    })

    // Job Status Update: (dev-akash)
    app.put('/approve-job/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      // create a document that sets the plot of the movie
      const updateDoc = {
        $set: {
          status: 'active'
        },
      };
      const result = await jobsCollection.updateOne(filter, updateDoc, options);
      res.json(result)
    });

    // Job Post Delete Method: (dev-akash)
    app.delete('/job-post/:id', async (req, res) => {
      const id = req.params.id;
      const deleteJob = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(deleteJob);
      if (result.deletedCount) {
        res.send(result)
      }
      else {
        res.send({ message: 'Something Went Wrong!' })
      }
    });

    // Apply Job Information(Applicant, JobID): dev-akash:
    app.post('/applicants', async (req, res) => {
      try {
        const applicant = req.body;
        console.log(applicant);
      } catch (error) {

      }
    })

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("testing server");
});

app.listen(port, () => {
  console.log(`Job Portal is sitting on port ${port}`);
});
