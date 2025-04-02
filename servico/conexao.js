import mysql from 'mysql2/promise'

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Suporte99',
    database: 'cupcakeria',
    ssl: { rejectUnauthorized: false }
})

export default pool;