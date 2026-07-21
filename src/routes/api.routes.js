const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');

// Ruta de búsqueda para Typebot
router.post('/search', apiController.searchProduct);

// Nueva ruta para el traspaso programático a humano y desactivación temporal del bot
router.post('/handover', apiController.triggerHandover);

// Ruta para generar chats de prueba en Chatwoot
router.get('/create-test-chats', apiController.createTestChats);

module.exports = router;
