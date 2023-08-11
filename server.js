if (process.env.NODE_ENV !== "production") {
    require("dotenv").config({path: "../.env"})
}

const express = require("express")
const app = express()
const expressLayouts = require("express-ejs-layouts")
const indexRouter = require("./routes/index")
const authorRouter = require("./routes/authors")
const bookRouter = require('./routes/books')

app.set("view engine", "ejs")
app.set("views", __dirname + "/views")
app.set("layout", "layouts/layout")
app.use(expressLayouts)
app.use(express.static("public"))
app.use(express.urlencoded({limit: '10mb', extended: false}))
app.use(express.json())
app.use("/", indexRouter)
app.use('/authors', authorRouter)
app.use('/books', bookRouter)


const mongoose = require("mongoose")
// const mongooseURI = "mongodb+srv://ziamohsin409:NfknfSa7x4zJ9LH7@mybrary.7x6n8s6.mongodb.net/?retryWrites=true&w=majority"
function connectMongo() {
    mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    const db = mongoose.connection
    db.on("error", error => console.error(error))
    db.once("open", () => console.log("Connected to Mongoose"))
}

app.listen(process.env.PORT || 3000, () => {
    connectMongo()
    console.log("App listening on port: 3000")
})