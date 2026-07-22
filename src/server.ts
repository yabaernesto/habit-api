import fastify from "fastify";
import cors from "@fastify/cors";

import { prisma } from "./lib/prisma";

const app = fastify();

app.register(cors);

app.get("/hello", async (request, reply) => {
  const habits = await prisma.habit.findMany();

  return habits;
});

app
  .listen({ port: 3333, host: "0.0.0.0" })
  .then(() => console.log("HTTP Server running!"));
