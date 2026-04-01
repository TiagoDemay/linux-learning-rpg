import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    // TiDB não suporta DEFAULT ('[]') para JSON — usar NULL e tratar no código
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`tournament_history\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`tournamentId\` varchar(64) NOT NULL,
        \`tournamentName\` varchar(128) NOT NULL,
        \`resetAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`userId\` int NOT NULL,
        \`userName\` text,
        \`userEmail\` varchar(320),
        \`coins\` int NOT NULL DEFAULT 0,
        \`completedLevels\` json,
        \`currentLevel\` varchar(64) NOT NULL DEFAULT 'floresta-stallman',
        \`challengeProgress\` json,
        \`position\` int NOT NULL DEFAULT 0,
        CONSTRAINT \`tournament_history_id\` PRIMARY KEY(\`id\`)
      )
    `);
    const [rows] = await conn.execute("SHOW TABLES LIKE 'tournament_history'");
    console.log("✅ Tabela tournament_history criada/verificada. Linhas encontradas:", rows.length);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("❌ Erro ao criar tabela:", err.message);
  process.exit(1);
});
