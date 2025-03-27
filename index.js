const express = require ('express');
const cors = require ('cors');
const app = express();
require('dotenv').config()

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.k7k1l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    const database = client.db("bookCove");
    const booksCollection = database.collection("books");
    // const borrowedBooksCollection = database.collection("borrowedBooks");

    // save a bookData in DB
    app.post('/add-book', async ( req, res ) => {
        const bookData = req.body
        const result = await booksCollection.insertOne(bookData)
        console.log(result);
        res.send(result)
    })
    // get all books data
    app.get("/books", async (req, res) => {
        const category = req.query.category;
        const query = category ? { category } : {};
        const result = await booksCollection.find(query).toArray();
        res.send(result);
      });






  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{
    res.send('CRUD OPERATION IS RUNNING')
})

app.listen(port,()=>{
    console.log(`Crud is Running On Port:${port}`)
})