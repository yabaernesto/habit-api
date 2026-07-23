import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const url = `${process.env.DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "dev" ? ["query"] : [],
});

export { prisma };
