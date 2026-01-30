const express = require('express');
const router = express.Router();
const foodController = require('../controllers/food.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authMiddleware);

router.get('/', foodController.getAll);
router.get('/:id', foodController.getById);
router.post('/', upload.single('gambar'), foodController.create);
router.put('/:id', upload.single('gambar'), foodController.update);
router.delete('/:id', foodController.delete);

module.exports = router;
