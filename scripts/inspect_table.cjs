const { Client } = require('pg');

async function main() {
  const table = process.argv[2];
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!table) {
    throw new Error('Usage: node scripts/inspect_table.cjs <table_name>');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const result = await client.query(
    `select column_name, data_type
     from information_schema.columns
     where table_schema = 'public'
       and table_name = $1
     order by ordinal_position`,
    [table]
  );

  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
