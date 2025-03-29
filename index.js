const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.k7k1l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db("bookCove");
    const booksCollection = database.collection("books");

    // Add a new book
    app.post("/add-book", async (req, res) => {
      const bookData = req.body;
      const result = await booksCollection.insertOne(bookData);
      res.send(result);
    });

    // Get all books by category
    app.get("/books", async (req, res) => {
      const category = req.query.category;
      const query = category ? { category } : {};
      const result = await booksCollection.find(query).toArray();
      res.send(result);
    });

    // Get single book details
    app.get("/books/:id", async (req, res) => {
      const { id } = req.params;
      const book = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(book);
    });

    // Update book
    app.put("/books/:id", async (req, res) => {
      const { id } = req.params;
      const { _id, ...updatedData } = req.body; // Removing _id field from updated data

      // Ensure quantity is a number
      if (updatedData.quantity) {
        updatedData.quantity = Number(updatedData.quantity); // Convert to number
      }

      try {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: updatedData };

        const result = await booksCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).send({ message: "Failed to update book" });
      }
    });

    // Borrow a book
    app.post("/borrow", async (req, res) => {
      const { bookId, userName, userEmail, returnDate } = req.body;

      // Check book availability
      const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
      if (!book || book.quantity <= 0) {
        return res.status(400).send({ message: "This book is out of stock!" });
      }

      // Decrease book quantity
      await booksCollection.updateOne({ _id: new ObjectId(bookId) }, { $inc: { quantity: -1 } });

      res.send({ message: "Book borrowed successfully!" });
    });
  } finally {
    // await client.close(); // Uncomment if needed
  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("Book Borrowing System is Running!"));
app.listen(port, () => console.log(`Server running on port: ${port}`));
