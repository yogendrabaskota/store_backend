import app from "./src/app";

const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.send("Server is Running!!!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
