const bcrypt = require('bcrypt');

const password = '123456'; // Cambia esto por la contraseña que deseas
const hashedPassword = bcrypt.hashSync(password, 10);

console.log(hashedPassword);