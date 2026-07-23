import { backfillPendingResourceEmbeddings } from "../src/services/ai/resource-retrieval-service";
import { db } from "../src/lib/db";

async function main() {
  const result = await backfillPendingResourceEmbeddings();
  console.log(`Embedded pending chunks for ${result.resourcesProcessed} resources.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
