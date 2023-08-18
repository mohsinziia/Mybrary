const express = require("express")
const router = express.Router()

const multer = require('multer')
const multerS3 = require('multer-s3')
const bucketName = process.env.CYCLIC_BUCKET_NAME

const path = require('path')
const fs = require('@cyclic.sh/s3fs')(bucketName)

const Book = require('../models/book')
const Author = require('../models/author')

const uploadPath = path.join('public', Book.coverImageBasePath)
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif']

const AWS = require('aws-sdk')
const s3 = new AWS.S3()


const bucketPolicyParams = {
    Bucket: bucketName,
    Policy: JSON.stringify({
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    }),
};

s3.putBucketPolicy(bucketPolicyParams, (err, data) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Bucket policy created:', data);
    }
});

s3.getBucketPolicy(params, (err, data)) {
    if (err) {
        console.error('Error listing bucket policies:', err)
    } else {
        console.log('Bucket policies:', data.Policy)
    }
}

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.CYCLIC_BUCKET_NAME,
        // acl: 'public-read',
        key: (req, file, cb) => {
          cb(null, file.originalname);
        }
    }),
    // dest: uploadPath,
    fileFilter: (req, file, callback) => {
        callback(null, imageMimeTypes.includes(file.mimetype))
    }
})

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
    const fileName = req.file != null ? req.file.originalname : null
    console.log(req.file)
    const book = new Book({
        title: req.body.title,
        author: req.body.author,
        publishDate: new Date(req.body.publishDate),
        pageCount: req.body.pageCount,
        coverImageName: fileName,
        description: req.body.description
    })
    console.log(book)
    
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
    fs.unlink(path.join('s3fs', fileName), err => {
        if (err) console.error(err);
    })
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