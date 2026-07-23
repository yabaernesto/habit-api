import z from "zod";
import dayjs from "dayjs";
import type { FastifyInstance } from "fastify";

import { prisma } from "./lib/prisma";

export async function appRoutes(app: FastifyInstance) {
  app.post("/habits", async (request, reply) => {
    const createHabitBody = z.object({
      title: z.string(),
      habitWeekDays: z.array(z.number().min(0).max(6)),
    });

    const { title, habitWeekDays } = createHabitBody.parse(request.body);

    const today = dayjs().startOf("day").toDate();

    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        habitWeekDays: {
          create: habitWeekDays.map((habitWeekDay) => {
            return {
              week_day: habitWeekDay,
            };
          }),
        },
      },
    });
  });
}
