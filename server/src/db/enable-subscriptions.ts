import { db } from './index.js';
import { organizations } from './schema.js';
import { sql } from 'drizzle-orm';

async function enableSubscriptions() {
    console.log('Enabling user subscriptions for all organizations...');

    const result = await db
        .update(organizations)
        .set({
            userSubscriptionEnabled: true,
            userMonthlyPricePiasters: sql`COALESCE(${organizations.userMonthlyPricePiasters}, 1000)`,
            userAnnualPricePiasters: sql`COALESCE(${organizations.userAnnualPricePiasters}, 9600)`,
            userCurrency: sql`COALESCE(${organizations.userCurrency}, 'USD')`,
        })
        .returning();

    console.log(`✅ Updated ${result.length} organization(s)`);
    console.log('Subscription settings:');
    result.forEach(org => {
        console.log(`  - ${org.name}: $${org.userMonthlyPricePiasters / 100}/mo, $${org.userAnnualPricePiasters / 100}/yr`);
    });

    process.exit(0);
}

enableSubscriptions().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
