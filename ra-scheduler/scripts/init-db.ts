import { initSchema } from '../src/lib/db';

async function main() {
    console.log('Initializing schema...');
    try {
        await initSchema();
        console.log('Schema initialization complete.');
    } catch (err) {
        console.error('Failed to initialize schema:', err);
        process.exit(1);
    }
}

main();
