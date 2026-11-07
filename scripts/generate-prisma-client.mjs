import {ensurePrismaClient,generatePrismaClient} from './lib/prisma-client.mjs';
if(process.argv.includes('--if-needed'))ensurePrismaClient();
else generatePrismaClient();
