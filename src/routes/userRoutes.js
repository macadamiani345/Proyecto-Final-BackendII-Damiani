const { Router } = require('express');
const { getProfile, getAdmin } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();

// GET /api/v1/profile — Protegida por JWT
router.get('/profile', authMiddleware, getProfile);

// GET /api/v1/admin — Protegida por JWT + rol admin
router.get('/admin', authMiddleware, roleMiddleware('admin'), getAdmin);

module.exports = router;
