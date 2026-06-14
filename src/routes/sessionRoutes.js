const { Router } = require('express');
const { getSession } = require('../controllers/sessionController');

const router = Router();

// GET /api/v1/session — Información de la sesión actual
router.get('/', getSession);

module.exports = router;
