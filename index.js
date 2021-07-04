// Import necessary packages
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
  },
});

// create and configure the express app
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Database Connection Info
const MongoClient = require("mongodb").MongoClient;

// the URL we copied from earlier. Replace username and password with what you created in the initial steps
const url =
  "mongodb+srv://admin:hola1234@cluster0.c0h03.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
let db;
// Connect to the database with [url]
(async () => {
  let client = await MongoClient.connect(url, { useNewUrlParser: true});

  db = client.db("Players");

  httpServer.listen(PORT);
})();

// The index route
app.get("/", (req, res) => {
  res.send("Sweet Game Leaderboard API!");
});

app.post("/players", async (req, res) => {
  // get information of player from POST body data
  const { username, score } = req.body;

  // check if the username already exists
  const alreadyExisting = await db
    .collection("players")
    .findOne({ username: username });

  if (alreadyExisting) {
    res.send({ status: false, msg: "player username already exists" });
  } else {
    // create the new player
    await db.collection("players").insertOne({ username, score });
    console.log(`Created Player ${username}`);
    res.send({ status: true, msg: "player created" });
  }
});

app.get("/players", async (req, res) => {
  // retrieve ‘lim’ from the query string info
  db.collection("players")
    .find()
    // -1 is for descending and 1 is for ascending
    .sort({ score: -1 })
    // Show only [lim] players
    .toArray(function (err, result) {
      if (err) res.send({ status: false, msg: "failed to retrieve players" });
      console.log(Array.from(result));
      res.send({ status: true, msg: result });
    });
});

app.get("/player", async (req, res) => {
  const { username } = req.query;

  const alreadyExisting = await db
    .collection("players")
    .findOne({ username: username });

  alreadyExisting
    ? await db
        .collection("players")
        .find({ username })
        .toArray(function (err, docs) {
          res.send(docs);
        })
    : res.send("el usuario no existe");
});

app.put("/players", async (req, res) => {
  const { username, score } = req.body;
  // check if the username already exists
  const alreadyExisting = await db
    .collection("players")
    .findOne({ username: username });
  if (alreadyExisting) {
    // Update player object with the username
    await db
      .collection("players")
      .updateOne({ username }, { $set: { username, score } });
    console.log(`Player ${username} score updated to ${score}`);
    res.send({ status: true, msg: "player score updated", data: { score } });
  } else {
    res.send({ status: false, msg: "player username not found" });
  }
});

app.delete("/players", async function (req, res) {
  let { username } = req.body;
  // check if the username already exists
  const alreadyExisting = await db
    .collection("players")
    .findOne({ username: username });

  if (alreadyExisting) {
    await db.collection("players").deleteOne({ username });
    console.log(`Player ${username} deleted`);
    res.send({ status: true, msg: "player deleted" });
  } else {
    res.send({ status: false, msg: "username not found" });
  }
});

io.on("connection", function (socket) {
  let players = {
    Homero: {},
    Bart: {},
  };

  db.collection("players")
    .find()
    // -1 is for descending and 1 is for ascending
    .sort({ score: -1 })
    // Show only [lim] players
    .toArray(function (err, result) {
      if (err) res.send({ status: false, msg: "failed to retrieve players" });
      result.forEach((element) => {
        if (element.username === "Homero") {
          players.Homero = element;
        } else if (element.username === "Bart") {
          players.Bart = element;
        }
      });
      socket.emit("inicio", players);
    });
  socket.on("actualizar", (props, callback) => {
    db.collection("players")
      .find()
      // -1 is for descending and 1 is for ascending
      .sort({ score: -1 })
      // Show only [lim] players
      .toArray(function (err, result) {
        if (err) res.send({ status: false, msg: "failed to retrieve players" });
        result.forEach((element) => {
          if (element.username === "Homero") {
            players.Homero = element;
          } else if (element.username === "Bart") {
            players.Bart = element;
          }
        });
        callback({
          ...players,
        });
      });
  });

  // when clients connect, send the latest data
});