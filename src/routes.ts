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

    return reply.status(201).send();
  });

  app.get("/day", async (request, reply) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
    });

    const { date } = getDayParams.parse(request.query);

    const parsedDate = dayjs().startOf("day");
    const weekDay = parsedDate.get("day");

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          // menor ou igual
          lte: date,
        },
        habitWeekDays: {
          // some: se ao menos um dos elementos no array passa
          some: {
            week_day: weekDay,
          },
        },
      },
    });

    const day = await prisma.day.findUnique({
      where: {
        date: parsedDate.toDate(),
      },
      // incluir todos os dayHabits que têm relacionamento com day
      include: {
        dayHabits: true,
      },
    });

    const completedHabits = day?.dayHabits.map((dayHabit) => {
      return dayHabit.habit_id;
    });

    return {
      possibleHabits,
      completedHabits,
    };
  });

  // completar / não completar hábito
  app.patch("/habits/:id/toggle", async (request, reply) => {
    const toggleHabitParams = z.object({
      id: z.string().uuid(),
    });

    const { id } = toggleHabitParams.parse(request.params);

    const today = dayjs().startOf("day").toDate();

    let day = await prisma.day.findUnique({
      where: {
        date: today,
      },
    });

    // se o dia não existir, criar
    if (!day) {
      day = await prisma.day.create({
        data: {
          date: today,
        },
      });
    }

    // buscar hábito que foi marcado como completo
    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: id,
        },
      },
    });

    // se o hábito já estiver marcado como completo, remover a marcação, caso contrário, marcar como completo
    if (dayHabit) {
      // remover a marcação de completo
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id,
        },
      });
    } else {
      // completar o hábito
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id,
        },
      });
    }
  });

  // resumo - a rota deve retornar quantos hábitos eram possíveis completar na data específica
  // e quantas foram completadas. Sub Queries no SQL é fazer SELECT dentro de outro SELECT
  app.get("/summary", async (request, reply) => {
    const summary = await prisma.$queryRaw`
      SELECT
        D.id,
        D.date,
        (
          SELECT 
            cast(count(*) as float)
          FROM day_habits DH
          WHERE DH.day_id = D.id
        ) as completed,
        (
          SELECT
            cast(count(*) as float)
          FROM habit_week_days HWD
          JOIN habits H
            ON H.id = HWD.habit_id
          WHERE
            HWD.week_day = cast(strftime('%w', D.date/1000.0, 'unixepoch') as int)
            AND H.created_at <= D.date
        ) as amount
      FROM days D
    `;

    return summary;
  });
}
