const pool = require("./lib/db");

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conectado ao MariaDB com sucesso!");
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao conectar no banco:");
    console.error(err.message);
    process.exit(1);
  }
}

testConnection();
