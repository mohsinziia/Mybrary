const express = require("express")
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('@cyclic.sh/s3fs')(process.env.CYCLIC_BUCKET_NAME)
const Book = require('../models/book')
const Author = require('../models/author')
const uploadPath = path.join('public', Book.coverImageBasePath)
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif']
const upload = multer({
    dest: uploadPath,
    fileFilter: (req, file, callback) => {
        callback(null, imageMimeTypes.includes(file.mimetype))
    }
})

// my code
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
async function addObject() {
    return await s3.putObject({
        Body: JSON.stringify({key:'value'}),
        Bucket: process.env.CYCLIC_BUCKET_NAME,
        Key: "some_files/my_file.json",
    }).promise()
}

async function getObject() {
    return await s3.getObject({
        Bucket: process.env.CYCLIC_BUCKET_NAME,
        Key: "some_files/my_file.json",
    }).promise()
}

const addedObject = addObject()
const gettedObject = getObject()
console.log(addedObject)
console.log(gettedObject)

// All Books Route
router.get("/", async (req, res) => {
    let query = Book.find()
    if (req.query.title != null && req.query.title != '') {
        query = query.regex('title', new RegExp(req.query.title, 'i'))
    }
    if (req.query.publishedBefore != null && req.query.publishedBefore != '') {
        query = query.lte('publishDate', req.query.publishedBefore)
    }
    if (req.query.publishedAfter != null && req.query.publishedAfter != '') {
        query = query.gte('publishDate', req.query.publishedAfter)
    }
    try {
        const books = await query.exec()
        res.render('books/index', {
            books: books,
            searchOptions: req.query
        })
    } catch {
        res.redirect('/')
    }
})

// New Book Route
router.get('/new', async (req, res) => {
    renderNewPage(res, new Book())
})

// Create Book Route
router.post('/', upload.single('cover'), async (req, res) => {
    const fileName = req.file != null ? req.file.filename : null
    const book = new Book({
        title: req.body.title,
        author: req.body.author,
        publishDate: new Date(req.body.publishDate),
        pageCount: req.body.pageCount,
        coverImageName: fileName,
        description: req.body.description
    })
    
    try {
        const newBook = await book.save()
        // res.redirect(`books/${newbook.id}`)
        res.redirect(`books`)
    } catch {
        if (book.coverImageName != null) {
            removeBookCover(book.coverImageName)
        }
        renderNewPage(res, book, true)
    }
})

function removeBookCover(fileName) {
    // fs.unlink(path.join(uploadPath, fileName), err => {
    //     if (err) console.error(err);
    // })
}

async function renderNewPage(res, book, hasError = true) {
    try {
        const authors = await Author.find({})
        const params = {
            authors: authors,
            book: book
        }
        if (hasError) params.errorMessage = 'Error Creating Book'
        res.render('books/new', params)
    } catch {
        res.redirect('/books')
    }
}

module.exports = router;