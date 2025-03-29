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
    const borrowedBooksCollection = database.collection("borrowedBooks");

    // Get borrowed books for a specific user
    app.get("/borrowed-books", async (req, res) => {
      const { email } = req.query;
      if (!email) return res.status(400).send({ message: "User email required!" });

      const borrowedBooks = await borrowedBooksCollection.find({ userEmail: email }).toArray();
      res.send(borrowedBooks);
    });





    app.post("/borrow", async (req, res) => {
      const { bookId, userEmail, returnDate, image, name, category  } = req.body;
    
      try {
        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
    
        if (!book) return res.status(404).send({ message: "Book not found" });
    
        const quantity = parseInt(book.quantity); // Ensure quantity is a number
    
        if (quantity > 0) {
          await booksCollection.updateOne(
            { _id: new ObjectId(bookId) },
            { $set: { quantity: quantity - 1 } } // Decrease the quantity
          );
    
          await borrowedBooksCollection.insertOne({
            bookId,
            userEmail,
            returnDate,
            image,
            name,
            category ,
            borrowedDate: new Date().toISOString(),
          });
    
          return res.send({ message: "Book borrowed successfully!" });
        } else {
          return res.status(400).send({ message: "Book is out of stock!" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error borrowing book!", error });
      }
    });    
    



    app.delete("/return-book/:id", async (req, res) => {
      const { id } = req.params;
      const { bookId } = req.body;
    
      try {
        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
    
        if (!book) return res.status(404).send({ message: "Book not found" });
    
        const quantity = parseInt(book.quantity); // Ensure quantity is a number
    
        await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $set: { quantity: quantity + 1 } } // Increase quantity after returning
        );
    
        await borrowedBooksCollection.deleteOne({ _id: new ObjectId(id) });
    
        return res.send({ message: "Book returned successfully!" });
      } catch (error) {
        res.status(500).send({ message: "Error returning book!", error });
      }
    });    
    









    // Add a new book (for testing purposes)
    app.post("/add-book", async (req, res) => {
      const bookData = req.body;
      // Ensure quantity is a number
      bookData.quantity = Number(bookData.quantity);
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

    // Update book details
    app.put("/books/:id", async (req, res) => {
      const { id } = req.params;
      const { _id, ...updatedData } = req.body; 

      if (updatedData.quantity) {
        updatedData.quantity = Number(updatedData.quantity); 
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

  } finally {
    // Uncomment if you want to close the connection after the operation
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("Book Borrowing System is Running!"));
app.listen(port, () => console.log(`Server running on port: ${port}`));

