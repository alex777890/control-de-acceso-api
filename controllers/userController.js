const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const connection = require('../db');

const RECAPTCHA_SECRET_KEY = '6LeKnNwqAAAAABQIgzfvCZI37Ikyxvdi5dMgQqnz';
const loginAttempts = {};

// Registrar un nuevo usuario
exports.registerUser = (req, res) => {
    const { nombre, telefono, email, password, id_rol } = req.body;
    connection.query('SELECT * FROM tb_roles WHERE id_rol = ?', [id_rol], (err, roleResults) => {
        if (err) return res.status(500).json({ message: 'Error al verificar el rol' });
        if (roleResults.length === 0) return res.status(400).json({ message: 'El rol especificado no existe.' });

        connection.query('SELECT * FROM tb_usuarios WHERE email = ? OR telefono = ?', [email, telefono], (err, results) => {
            if (err) return res.status(500).json({ message: 'Error al verificar el usuario' });
            if (results.length > 0) return res.status(400).json({ message: 'El usuario ya existe' });

            const hashedPassword = bcrypt.hashSync(password, 10);
            connection.query('INSERT INTO tb_usuarios (nombre, telefono, email, password, id_rol) VALUES (?, ?, ?, ?, ?)', 
                [nombre, telefono, email, hashedPassword, id_rol], 
                (err) => {
                    if (err) return res.status(500).json({ message: 'Error al registrar el usuario' });
                    res.status(201).json({ message: 'Usuario registrado con éxito' });
                }
            );
        });
    });
};

// Iniciar sesión
exports.loginUser = async (req, res) => {
    const { email, password, captchaResponse } = req.body;
    if (loginAttempts[email] && loginAttempts[email].attempts >= 4) {
        const timeBlocked = Date.now() - loginAttempts[email].lastAttempt;
        if (timeBlocked < 3 * 60 * 1000) return res.status(403).json({ message: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.' });
        loginAttempts[email] = { attempts: 0, lastAttempt: null };
    }
    if (loginAttempts[email] && loginAttempts[email].attempts >= 3) {
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${captchaResponse}`;
        const response = await axios.post(verificationUrl);
        if (!response.data.success) return res.status(400).json({ message: 'Verificación de reCAPTCHA fallida.' });
    }
    connection.query('SELECT * FROM tb_usuarios WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al buscar el usuario' });
        if (results.length === 0) {
            loginAttempts[email] = loginAttempts[email] || { attempts: 0, lastAttempt: Date.now() };
            loginAttempts[email].attempts++;
            loginAttempts[email].lastAttempt = Date.now();
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        const user = results[0];
        if (bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign({ id: user.id_usuario, role: user.id_rol }, 'tu_secreto', { expiresIn: '1h' });
            res.json({ token, role: user.id_rol });
        } else {
            loginAttempts[email] = loginAttempts[email] || { attempts: 0, lastAttempt: Date.now() };
            loginAttempts[email].attempts++;
            loginAttempts[email].lastAttempt = Date.now();
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
    });
};

// Obtener todos los usuarios
exports.getAllUsers = (req, res) => {
    connection.query('SELECT * FROM tb_usuarios', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los usuarios' });
        res.json(results);
    });
};

// Actualizar usuario
exports.updateUser = (req, res) => {
    const { nombre, telefono, email, id_rol } = req.body;
    const { id } = req.params;
    connection.query('UPDATE tb_usuarios SET nombre = ?, telefono = ?, email = ?, id_rol = ? WHERE id_usuario = ?', 
        [nombre, telefono, email, id_rol, id], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al actualizar el usuario' });
            res.json({ message: 'Usuario actualizado con éxito' });
        }
    );
};

// Eliminar usuario
exports.deleteUser = (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM tb_usuarios WHERE id_usuario = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el usuario' });
        res.json({ message: 'Usuario eliminado con éxito' });
    });
};

// Importar usuarios desde Excel
exports.importUsers = (req, res) => {
    const users = req.body;
    const inserted = [];
    const rejected = [];
    const checkAndInsert = (user, callback) => {
        const { nombre, telefono, email, password, id_rol } = user;
        connection.query('SELECT * FROM tb_usuarios WHERE email = ? OR telefono = ?', [email, telefono], (err, results) => {
            if (err) return callback(err);
            if (results.length > 0) {
                rejected.push({ ...user, reason: 'Email o teléfono ya existe' });
                return callback(null);
            }
            const hashedPassword = bcrypt.hashSync(password, 10);
            connection.query('INSERT INTO tb_usuarios (nombre, telefono, email, password, id_rol) VALUES (?, ?, ?, ?, ?)', 
                [nombre, telefono, email, hashedPassword, id_rol], 
                (err) => {
                    if (err) rejected.push({ ...user, reason: 'Error al insertar' });
                    else inserted.push(user);
                    callback(null);
                }
            );
        });
    };
    let index = 0;
    const processNext = () => {
        if (index >= users.length) return res.json({ message: `Usuarios procesados: ${inserted.length} insertados, ${rejected.length} rechazados`, inserted, rejected });
        checkAndInsert(users[index], (err) => {
            if (err) return res.status(500).json({ message: 'Error al procesar el archivo' });
            index++;
            processNext();
        });
    };
    processNext();
};

// CRUD para tb_vigilantes
exports.getAllVigilantes = (req, res) => {
    connection.query('SELECT * FROM tb_vigilantes', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los vigilantes' });
        res.json(results);
    });
};
exports.createVigilante = (req, res) => {
    const { nombre, telefono, email, turno } = req.body;
    connection.query('INSERT INTO tb_vigilantes (nombre, telefono, email, turno) VALUES (?, ?, ?, ?)', 
        [nombre, telefono, email, turno], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al crear el vigilante' });
            res.status(201).json({ message: 'Vigilante creado con éxito' });
        }
    );
};
exports.updateVigilante = (req, res) => {
    const { nombre, telefono, email, turno } = req.body;
    const { id } = req.params;
    connection.query('UPDATE tb_vigilantes SET nombre = ?, telefono = ?, email = ?, turno = ? WHERE id_vigilante = ?', 
        [nombre, telefono, email, turno, id], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al actualizar el vigilante' });
            res.json({ message: 'Vigilante actualizado con éxito' });
        }
    );
};
exports.deleteVigilante = (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM tb_vigilantes WHERE id_vigilante = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el vigilante' });
        res.json({ message: 'Vigilante eliminado con éxito' });
    });
};

// CRUD para tb_autos
exports.getAllAutos = (req, res) => {
    connection.query('SELECT * FROM tb_autos', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los autos' });
        res.json(results);
    });
};
exports.createAuto = (req, res) => {
    const { placa, modelo, color, id_usuario } = req.body;
    connection.query('INSERT INTO tb_autos (placa, modelo, color, id_usuario) VALUES (?, ?, ?, ?)', 
        [placa, modelo, color, id_usuario], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al crear el auto' });
            res.status(201).json({ message: 'Auto creado con éxito' });
        }
    );
};
exports.updateAuto = (req, res) => {
    const { placa, modelo, color, id_usuario } = req.body;
    const { id } = req.params;
    connection.query('UPDATE tb_autos SET placa = ?, modelo = ?, color = ?, id_usuario = ? WHERE id_auto = ?', 
        [placa, modelo, color, id_usuario, id], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al actualizar el auto' });
            res.json({ message: 'Auto actualizado con éxito' });
        }
    );
};
exports.deleteAuto = (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM tb_autos WHERE id_auto = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el auto' });
        res.json({ message: 'Auto eliminado con éxito' });
    });
};

// CRUD para tb_accesos
exports.getAllAccesos = (req, res) => {
    connection.query('SELECT * FROM tb_accesos', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los accesos' });
        res.json(results);
    });
};
exports.createAcceso = (req, res) => {
    const { id_usuario, id_auto, codigo, estado, fecha_expiracion } = req.body;
    connection.query('INSERT INTO tb_accesos (id_usuario, id_auto, codigo, estado, fecha_expiracion) VALUES (?, ?, ?, ?, ?)', 
        [id_usuario, id_auto, codigo, estado, fecha_expiracion], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al crear el acceso' });
            res.status(201).json({ message: 'Acceso creado con éxito' });
        }
    );
};
exports.updateAcceso = (req, res) => {
    const { id_usuario, id_auto, codigo, estado, fecha_expiracion } = req.body;
    const { id } = req.params;
    connection.query('UPDATE tb_accesos SET id_usuario = ?, id_auto = ?, codigo = ?, estado = ?, fecha_expiracion = ? WHERE id_acceso = ?', 
        [id_usuario, id_auto, codigo, estado, fecha_expiracion, id], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al actualizar el acceso' });
            res.json({ message: 'Acceso actualizado con éxito' });
        }
    );
};
exports.deleteAcceso = (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM tb_accesos WHERE id_acceso = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el acceso' });
        res.json({ message: 'Acceso eliminado con éxito' });
    });
};

// CRUD para tb_detalle_acceso
exports.getAllDetalleAcceso = (req, res) => {
    connection.query('SELECT * FROM tb_detalle_acceso', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los registros de acceso' });
        res.json(results);
    });
};
exports.createDetalleAcceso = (req, res) => {
    const { id_acceso, id_vigilante, fecha_salida } = req.body;
    connection.query('INSERT INTO tb_detalle_acceso (id_acceso, id_vigilante, fecha_salida) VALUES (?, ?, ?)', 
        [id_acceso, id_vigilante, fecha_salida], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al crear el registro de acceso' });
            res.status(201).json({ message: 'Registro creado con éxito' });
        }
    );
};
exports.updateDetalleAcceso = (req, res) => {
    const { id_acceso, id_vigilante, fecha_salida } = req.body;
    const { id } = req.params;
    connection.query('UPDATE tb_detalle_acceso SET id_acceso = ?, id_vigilante = ?, fecha_salida = ? WHERE id_detalle_acceso = ?', 
        [id_acceso, id_vigilante, fecha_salida, id], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al actualizar el registro de acceso' });
            res.json({ message: 'Registro actualizado con éxito' });
        }
    );
};
exports.deleteDetalleAcceso = (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM tb_detalle_acceso WHERE id_detalle_acceso = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el registro de acceso' });
        res.json({ message: 'Registro eliminado con éxito' });
    });
};

// CRUD para tb_sensores
exports.getAllSensores = (req, res) => {
    connection.query('SELECT * FROM tb_sensores', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los sensores' });
        res.json(results);
    });
};
exports.createSensor = (req, res) => {
    const { ubicacion, estado } = req.body;
    connection.query('INSERT INTO tb_sensores (ubicacion, estado) VALUES (?, ?)', 
        [ubicacion, estado], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al crear el sensor' });
            res.status(201).json({ message: 'Sensor creado con éxito' });
        }
    );
};
exports.updateSensor = (req, res) => {
    const { ubicacion, estado } = req.body;
    const { id } = req.params;
    connection.query('UPDATE tb_sensores SET ubicacion = ?, estado = ? WHERE id_sensor = ?', 
        [ubicacion, estado, id], 
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al actualizar el sensor' });
            res.json({ message: 'Sensor actualizado con éxito' });
        }
    );
};
exports.deleteSensor = (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM tb_sensores WHERE id_sensor = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar el sensor' });
        res.json({ message: 'Sensor eliminado con éxito' });
    });
};