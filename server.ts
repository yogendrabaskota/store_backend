import app from "./src/app";

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Server is Running!!!");
});

console.log("departmentStore1");
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
