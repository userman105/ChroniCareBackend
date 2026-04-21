const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        const uniqueName =
            Date.now() +
            '-' +
            Math.round(Math.random() * 1e9) +
            ext;

        cb(null, uniqueName);
    },
});

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
];

const allowedExtensions = ['.jpg', '.jpeg', '.png'];

const fileFilter = (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/jpg'];
    const ext = path.extname(file.originalname).toLowerCase();

    const allowedExt = ['.jpg', '.jpeg', '.png'];

    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, JPEG, PNG images are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024, 
    },
});

module.exports = upload;