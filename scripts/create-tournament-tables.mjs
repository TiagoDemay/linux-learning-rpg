import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    // Tabela tournaments
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`tournaments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(128) NOT NULL,
        \`status\` enum('active','finished') NOT NULL DEFAULT 'active',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
    console.log("✅ Tabela tournaments criada");

    // Tabela tournament_participants
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`tournament_participants\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`tournamentId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`joinedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_tournament_user\` (\`tournamentId\`, \`userId\`)
      )
    `);
    console.log("✅ Tabela tournament_participants criada");

    // Adicionar coluna tournamentId na active_tournament se não existir
    const [cols] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'active_tournament' AND COLUMN_NAME = 'tournamentId'
    `);
    if (cols.length === 0) {
      await conn.execute(`
        ALTER TABLE \`active_tournament\` ADD COLUMN \`tournamentId\` int NULL
      `);
      console.log("✅ Coluna tournamentId adicionada em active_tournament");
    } else {
      console.log("ℹ️  Coluna tournamentId já existe em active_tournament");
    }

    const [rows] = await conn.execute("SELECT * FROM `active_tournament`");
    console.log("📋 active_tournament:", rows);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
