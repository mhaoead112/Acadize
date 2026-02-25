import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ DATABASE_URL environment variable is not set.");
    console.error("   Please ensure you have a .env file with your production database connection string.");
    process.exit(1);
}

const { Client } = pg;

const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function main() {
    try {
        await client.connect();
        console.log("✅ Connected to database.");

        const targetSubdomain = 'eduverse-prototype';
        const targetCustomDomain = 'eduverse-20jy.onrender.com';

        // Check for 'default' org
        const checkRes = await client.query("SELECT id, subdomain FROM organizations WHERE subdomain = 'default'");
        
        if (checkRes.rows.length > 0) {
            console.log("🔄 Found 'default' organization. Updating to match production domains...");
            
            await client.query(`
                UPDATE organizations 
                SET subdomain = $1, 
                    custom_domain = $2
                WHERE subdomain = 'default'
            `, [targetSubdomain, targetCustomDomain]);
            
            console.log(`✅ Organization updated successfully!`);
            console.log(`   - Subdomain: ${targetSubdomain}`);
            console.log(`   - Custom Domain: ${targetCustomDomain}`);
        } else {
            console.log("ℹ️ 'default' organization not found.");
            
            // Check if already updated
            const checkUpdated = await client.query("SELECT id FROM organizations WHERE subdomain = $1", [targetSubdomain]);
            if (checkUpdated.rows.length > 0) {
                console.log(`✅ Organization '${targetSubdomain}' already exists. No changes needed.`);
            } else {
                console.warn("⚠️ No organization found. You may need to run migrations or seed data.");
            }
        }

    } catch (err) {
        console.error("❌ Error running fix script:", err);
    } finally {
        await client.end();
    }
}

main();
