const express = require('express');
const multer = require('multer');
const hazardController = require('../controllers/HazardController');

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype && file.mimetype.startsWith('image/')) {
			cb(null, true);
			return;
		}

		cb(new Error('Only image files are allowed'));
	},
});

router.post('/upload-image', upload.single('image'), hazardController.uploadHazardImage);
router.post('/', hazardController.createHazard);
router.get('/', hazardController.getAllHazards);
router.patch('/:id/resolve', hazardController.resolveHazard);
router.get('/:id', hazardController.getHazardById);
router.put('/:id', hazardController.updateHazard);
router.delete('/:id', hazardController.deleteHazard);

module.exports = router;
