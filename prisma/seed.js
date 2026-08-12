import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.restaurantTable.createMany({
    data: [
      { label: "T2", capacity: 2 },
      { label: "T3", capacity: 3 },
      { label: "T4", capacity: 4 },
      { label: "T5", capacity: 5 },
      { label: "T6", capacity: 6 },
    ],
  });
  console.log("Seeded 5 tables.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());