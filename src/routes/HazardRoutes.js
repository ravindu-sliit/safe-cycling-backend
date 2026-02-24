const express = require('express');
const hazardController = require('../controllers/hazardController');

const router = express.Router();

router.post('/', hazardController.createHazard);
router.get('/', hazardController.getAllHazards);
router.get('/:id', hazardController.getHazardById);
router.put('/:id', hazardController.updateHazard);
router.delete('/:id', hazardController.deleteHazard);

module.exports = router;
