const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', transactionController.getAll);
router.get('/history', transactionController.getHistory);
router.get('/:id', transactionController.getById);
router.post('/', transactionController.create);
router.delete('/:id', transactionController.delete);

module.exports = router;
