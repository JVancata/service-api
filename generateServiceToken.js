require('dotenv').config();
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = process.env;

const token = jwt.sign({ service_id: parseInt(process.argv[2]) }, JWT_SECRET);
console.log(token);