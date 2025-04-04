const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://book-cove.web.app",
      "https://book-cove.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());

const logger = (req, res, next) => {
  console.log("inside the logger");
  next();
};

const verifyToken = (req, res, next) => {
  // console.log('inside verify Token medilwire', req.cookies);
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Uuauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.k7k1l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // console.log("Connected to MongoDB!");

    const database = client.db("bookCove");
    const booksCollection = database.collection("books");
    const borrowedBooksCollection = database.collection("borrowedBooks");

    // Auth Related Api jwt start
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "10h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Get borrowed books for a specific user
    app.get("/borrowed-books", verifyToken, async (req, res) => {
      const { email } = req.query;
      if (!email)
        return res.status(400).send({ message: "User email required!" });
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const borrowedBooks = await borrowedBooksCollection
        .find({ userEmail: email })
        .toArray();
      res.send(borrowedBooks);
    });

    app.post("/borrow", async (req, res) => {
      const { bookId, userEmail, returnDate, image, name, category } = req.body;

      try {
        const book = await booksCollection.findOne({
          _id: new ObjectId(bookId),
        });

        if (!book) return res.status(404).send({ message: "Book not found" });

        const quantity = parseInt(book.quantity);

        if (quantity > 0) {
          await booksCollection.updateOne(
            { _id: new ObjectId(bookId) },
            { $set: { quantity: quantity - 1 } }
          );

          await borrowedBooksCollection.insertOne({
            bookId,
            userEmail,
            returnDate,
            image,
            name,
            category,
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
        const book = await booksCollection.findOne({
          _id: new ObjectId(bookId),
        });

        if (!book) return res.status(404).send({ message: "Book not found" });

        const quantity = parseInt(book.quantity);

        await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $set: { quantity: quantity + 1 } }
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
      bookData.quantity = Number(bookData.quantity);
      const result = await booksCollection.insertOne(bookData);
      res.send(result);
    });

    // Get all books by category
    app.get("/books", logger, async (req, res) => {
      console.log("now inside the api callback");
      const category = req.query.category;
      const query = category ? { category } : {};

      // console.log(req.cookies?.token)

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
    app.put("/books/:id", verifyToken, async (req, res) => {
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
