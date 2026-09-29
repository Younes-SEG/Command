import { prisma } from './client';
import { demoIds } from './demo-ids';

async function clearDemo() {
  const retained: string[] = [];
  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { id: { in: demoIds.tasks } } });
    await tx.calendarEvent.deleteMany({ where: { id: { in: demoIds.events } } });
    await tx.scheduleEntry.deleteMany({ where: { id: { in: demoIds.schedules } } });
    await tx.assessment.deleteMany({ where: { id: { in: demoIds.assessments } } });
    for (const id of demoIds.courses) {
      const course = await tx.course.findUnique({
        where: { id },
        include: {
          _count: { select: { assessments: true, schedules: true, tasks: true, events: true } },
        },
      });
      if (!course) continue;
      if (Object.values(course._count).some((count) => count > 0)) retained.push(course.code);
      else await tx.course.delete({ where: { id } });
    }
    if (!(await tx.course.count({ where: { semesterId: demoIds.semester } })))
      await tx.semester.deleteMany({ where: { id: demoIds.semester } });
  });
  console.log('Demo entries removed. Personal entries and preferences were preserved.');
  if (retained.length)
    console.log(`Kept demo courses with your own linked entries: ${retained.join(', ')}.`);
}

clearDemo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
