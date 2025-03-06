const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes'); 

const app = express();
const PORT = 3001;


app.use(cors());
app.use(bodyParser.json());


app.use('/api', userRoutes);


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});