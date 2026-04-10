/**
 * AWS RDS PostgreSQL Connection
 * Connection to Apple Land ERP Database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

/**
 * Create a connection to AWS RDS PostgreSQL
 * @returns {Client} PostgreSQL client
 */
function createClient() {
  const caFilePath = process.env.CA_FILE;
  const sslEnabled = process.env.DB_SSL === 'true';
  const hasCaFile = caFilePath && fs.existsSync(path.resolve(caFilePath));

  const sslConfig = sslEnabled
    ? (hasCaFile
        ? {
            rejectUnauthorized: false,
            ca: fs.readFileSync(path.resolve(caFilePath)).toString()
          }
        : { rejectUnauthorized: false })
    : false;

  return new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: sslConfig
  });
}

/**
 * Test connection to the database
 */
async function testConnection() {
  const client = createClient();
  
  try {
    await client.connect();
    const res = await client.query('SELECT version()');
    console.log('✅ Database connected successfully!');
    console.log('PostgreSQL version:', res.rows[0].version);
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

module.exports = {
  createClient,
  testConnection
};

// Run test if called directly
if (require.main === module) {
  testConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}
