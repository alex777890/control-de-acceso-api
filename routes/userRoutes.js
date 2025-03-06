const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.get('/usuarios', userController.getAllUsers);
router.put('/usuarios/:id', userController.updateUser);
router.delete('/usuarios/:id', userController.deleteUser);
router.post('/import-users', userController.importUsers);

// Rutas para tb_vigilantes
router.get('/vigilantes', userController.getAllVigilantes);
router.post('/vigilantes', userController.createVigilante);
router.put('/vigilantes/:id', userController.updateVigilante);
router.delete('/vigilantes/:id', userController.deleteVigilante);

// Rutas para tb_autos
router.get('/autos', userController.getAllAutos);
router.post('/autos', userController.createAuto);
router.put('/autos/:id', userController.updateAuto);
router.delete('/autos/:id', userController.deleteAuto);

// Rutas para tb_accesos
router.get('/accesos', userController.getAllAccesos);
router.post('/accesos', userController.createAcceso);
router.put('/accesos/:id', userController.updateAcceso);
router.delete('/accesos/:id', userController.deleteAcceso);

// Rutas para tb_detalle_acceso
router.get('/detalle-acceso', userController.getAllDetalleAcceso);
router.post('/detalle-acceso', userController.createDetalleAcceso);
router.put('/detalle-acceso/:id', userController.updateDetalleAcceso);
router.delete('/detalle-acceso/:id', userController.deleteDetalleAcceso);

// Rutas para tb_sensores
router.get('/sensores', userController.getAllSensores);
router.post('/sensores', userController.createSensor);
router.put('/sensores/:id', userController.updateSensor);
router.delete('/sensores/:id', userController.deleteSensor);

module.exports = router;