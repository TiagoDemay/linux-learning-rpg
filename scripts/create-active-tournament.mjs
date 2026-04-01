import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`active_tournament\` (
        \`id\` int NOT NULL DEFAULT 1,
        \`name\` varchar(128) NOT NULL DEFAULT 'Torneio Atual',
        \`startedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`active_tournament_id\` PRIMARY KEY(\`id\`)
      )
    `);
    // Inserir linha inicial se não existir
    await conn.execute(`
      INSERT IGNORE INTO \`active_tournament\` (\`id\`, \`name\`, \`startedAt\`)
      VALUES (1, 'Torneio Atual', NOW())
    `);
    const [rows] = await conn.execute("SELECT * FROM `active_tournament`");
    console.log("✅ Tabela active_tournament criada. Dados:", rows);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
