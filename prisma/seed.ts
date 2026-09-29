import { prisma } from './client';
import { demoIds } from './demo-ids';
import type { Prisma } from '../src/generated/prisma/client';

const today = new Date();
function day(offset: number, hour = 23, minute = 59) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, hour, minute);
}
const termMonth = Math.floor(today.getMonth() / 4) * 4;
const termName = ['Winter', 'Summer', 'Fall'][Math.floor(termMonth / 4)];
const termEnd = new Date(Date.UTC(today.getFullYear(), termMonth + 4, 0));
const [seg, csi, mat, os] = demoIds.courses;

async function seed() {
  await prisma.$transaction(
    async (tx) => {
      const active = await tx.semester.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      await tx.semester.upsert({
        where: { id: demoIds.semester },
        update: {},
        create: {
          id: demoIds.semester,
          name: `${termName} ${today.getFullYear()}`,
          startDate: new Date(Date.UTC(today.getFullYear(), termMonth, 1)),
          endDate: termEnd,
          isActive: !active,
        },
      });
      const courses: Prisma.CourseCreateManyInput[] = [
        {
          id: seg,
          code: 'SEG3101',
          name: 'Software Requirements Analysis',
          instructor: 'Dr. Sarah Chen',
          color: '#7371e8',
          notes:
            'Office hours: Tuesdays, 2–3 pm, SITE 5022.\n\nKeep the requirements document and traceability matrix up to date after each stakeholder meeting.',
        },
        {
          id: csi,
          code: 'CSI3105',
          name: 'Design and Analysis of Algorithms',
          instructor: 'Dr. Marc LeBlanc',
          color: '#5b9c85',
          notes:
            'Focus this week: greedy algorithms and dynamic programming. Bring proof sketches to tutorials.',
        },
        {
          id: mat,
          code: 'MAT2377',
          name: 'Probability and Statistics',
          instructor: 'Dr. Amira Hassan',
          color: '#dfad61',
          notes:
            'A non-programmable calculator is permitted. Practice interpreting results as well as computing them.',
        },
        {
          id: os,
          code: 'CSI3131',
          name: 'Operating Systems',
          instructor: 'Dr. James Park',
          color: '#d47e92',
          notes:
            'Labs use Linux. Submit source code with a short README explaining how to compile and run.',
        },
      ].map((course) => ({ ...course, semesterId: demoIds.semester }));
      for (const course of courses)
        await tx.course.upsert({ where: { id: course.id }, update: {}, create: course });

      const assessment = (
        key: string,
        courseId: string,
        name: string,
        type: Prisma.AssessmentCreateManyInput['type'],
        weight: number,
        offset: number,
        score: number | null = null,
        status: Prisma.AssessmentCreateManyInput['status'] = 'NOT_STARTED',
      ): Prisma.AssessmentCreateManyInput => ({
        id: `demo-assessment-${key}`,
        courseId,
        name,
        type,
        weight,
        dueDate: day(offset),
        score,
        maxScore: 100,
        status: score !== null ? 'GRADED' : status,
      });
      const assessments = [
        assessment(
          'requirements',
          seg,
          'Requirements specification',
          'ASSIGNMENT',
          15,
          1,
          null,
          'IN_PROGRESS',
        ),
        assessment('prototype', seg, 'Interactive prototype', 'PROJECT', 20, 9),
        assessment('seg-midterm', seg, 'Midterm examination', 'MIDTERM', 20, 14),
        assessment('seg-final', seg, 'Final examination', 'FINAL_EXAM', 25, 38),
        assessment('seg-quiz', seg, 'Quiz 1 · Elicitation methods', 'QUIZ', 5, -8, 92),
        assessment('seg-project', seg, 'Stakeholder analysis', 'ASSIGNMENT', 15, -4, 86),
        assessment(
          'algorithms',
          csi,
          'Problem set 3 · Greedy algorithms',
          'ASSIGNMENT',
          15,
          3,
          null,
          'IN_PROGRESS',
        ),
        assessment('csi-quiz', csi, 'Quiz 1 · Complexity', 'QUIZ', 10, -5, 84),
        assessment('csi-midterm', csi, 'Midterm examination', 'MIDTERM', 30, 11),
        assessment('csi-final', csi, 'Final examination', 'FINAL_EXAM', 45, 40),
        assessment('probability', mat, 'Problem set 2 · Random variables', 'ASSIGNMENT', 20, 4),
        assessment('mat-quiz', mat, 'Quiz 1 · Distributions', 'QUIZ', 10, -7, 91),
        assessment('mat-midterm', mat, 'Midterm examination', 'MIDTERM', 30, 17),
        assessment('mat-final', mat, 'Final examination', 'FINAL_EXAM', 40, 42),
        assessment('processes', os, 'Lab 3 · Process scheduling', 'LAB', 15, 6),
        assessment('os-lab', os, 'Lab 2 · System calls', 'LAB', 15, -3, 88),
        assessment('os-midterm', os, 'Midterm examination', 'MIDTERM', 30, 20),
        assessment('os-final', os, 'Final examination', 'FINAL_EXAM', 40, 44),
      ];
      for (const value of assessments)
        await tx.assessment.upsert({ where: { id: value.id }, update: {}, create: value });

      const tasks: Prisma.TaskCreateManyInput[] = [
        {
          id: demoIds.tasks[0],
          title: 'Finish the requirements specification',
          description:
            'Review acceptance criteria and add the final use-case diagram before submitting.',
          dueDate: day(0, 18, 0),
          priority: 'HIGH',
          estimatedMinutes: 90,
          status: 'IN_PROGRESS',
          courseId: seg,
          assessmentId: 'demo-assessment-requirements',
        },
        {
          id: demoIds.tasks[1],
          title: 'Work through greedy algorithm problems',
          description:
            'Start with interval scheduling. Write a correctness proof for each solution.',
          dueDate: day(0, 20, 0),
          priority: 'HIGH',
          estimatedMinutes: 60,
          courseId: csi,
          assessmentId: 'demo-assessment-algorithms',
        },
        {
          id: demoIds.tasks[2],
          title: 'Review probability lecture notes',
          description: 'Summarize expectation and variance rules on one page.',
          dueDate: day(1, 16, 0),
          priority: 'MEDIUM',
          estimatedMinutes: 45,
          courseId: mat,
        },
        {
          id: demoIds.tasks[3],
          title: 'Read chapter 4 before the lecture',
          description: 'Make a short list of questions about stakeholder interviews.',
          dueDate: day(-1, 17, 0),
          priority: 'MEDIUM',
          estimatedMinutes: 30,
          courseId: seg,
        },
        {
          id: demoIds.tasks[4],
          title: 'Implement round-robin scheduling',
          description: 'Compare average waiting times for three different time slices.',
          dueDate: day(3, 18, 0),
          priority: 'MEDIUM',
          estimatedMinutes: 120,
          courseId: os,
          assessmentId: 'demo-assessment-processes',
        },
        {
          id: demoIds.tasks[5],
          title: 'Prepare questions for office hours',
          description: 'Ask about the exchange argument in the greedy proof.',
          dueDate: day(2, 12, 0),
          priority: 'LOW',
          estimatedMinutes: 15,
          courseId: csi,
        },
        {
          id: demoIds.tasks[6],
          title: 'Organize this week’s lecture notes',
          description: '',
          dueDate: day(-1, 20, 0),
          priority: 'LOW',
          estimatedMinutes: 20,
          status: 'COMPLETED',
          completedAt: day(-1, 15, 30),
        },
        {
          id: demoIds.tasks[7],
          title: 'Make a midterm study plan',
          description: 'Block out two study sessions for each course.',
          dueDate: day(5, 18, 0),
          priority: 'HIGH',
          estimatedMinutes: 30,
        },
      ];
      for (const task of tasks)
        await tx.task.upsert({
          where: { id: task.id },
          update: {},
          create: {
            ...task,
            createdAt: day(-3, 10, 0),
            ...(task.id === demoIds.tasks[0]
              ? {
                  subtasks: {
                    create: [
                      {
                        id: 'demo-subtask-criteria',
                        title: 'Review acceptance criteria',
                        completed: true,
                        position: 0,
                      },
                      {
                        id: 'demo-subtask-diagram',
                        title: 'Add use-case diagram',
                        completed: false,
                        position: 1,
                      },
                      {
                        id: 'demo-subtask-proofread',
                        title: 'Proofread and submit',
                        completed: false,
                        position: 2,
                      },
                    ],
                  },
                }
              : {}),
          },
        });

      const events: Prisma.CalendarEventCreateManyInput[] = [
        {
          id: demoIds.events[0],
          title: 'Algorithms study session',
          description: 'Bring problem set 3 and compare proof strategies.',
          startAt: day(1, 15, 0),
          endAt: day(1, 16, 30),
          location: 'Morisset Library · Room 204',
          courseId: csi,
          color: '#5b9c85',
        },
        {
          id: demoIds.events[1],
          title: 'Office hours',
          description: 'Questions about requirements validation.',
          startAt: day(2, 14, 0),
          endAt: day(2, 15, 0),
          location: 'SITE 5022',
          courseId: seg,
          color: '#7371e8',
        },
        {
          id: demoIds.events[2],
          title: 'Coffee & a reset',
          description: 'A little space between classes.',
          startAt: day(0, 12, 0),
          endAt: day(0, 12, 45),
          location: 'Campus café',
          color: '#a89272',
        },
      ];
      for (const event of events)
        await tx.calendarEvent.upsert({ where: { id: event.id }, update: {}, create: event });
      const schedules: Prisma.ScheduleEntryCreateManyInput[] = [
        {
          id: demoIds.schedules[0],
          courseId: seg,
          title: 'Lecture',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:20',
          location: 'SITE · Room B0138',
        },
        {
          id: demoIds.schedules[1],
          courseId: seg,
          title: 'Lecture',
          dayOfWeek: 3,
          startTime: '09:00',
          endTime: '10:20',
          location: 'SITE · Room B0138',
        },
        {
          id: demoIds.schedules[2],
          courseId: csi,
          title: 'Lecture',
          dayOfWeek: 2,
          startTime: '10:00',
          endTime: '11:20',
          location: 'STE · Room J0106',
        },
        {
          id: demoIds.schedules[3],
          courseId: csi,
          title: 'Tutorial',
          dayOfWeek: 4,
          startTime: '10:00',
          endTime: '11:20',
          location: 'STE · Room J0106',
        },
        {
          id: demoIds.schedules[4],
          courseId: mat,
          title: 'Lecture',
          dayOfWeek: 1,
          startTime: '13:00',
          endTime: '14:20',
          location: 'FSS · Room 1030',
        },
        {
          id: demoIds.schedules[5],
          courseId: mat,
          title: 'Lecture',
          dayOfWeek: 5,
          startTime: '13:00',
          endTime: '14:20',
          location: 'FSS · Room 1030',
        },
        {
          id: demoIds.schedules[6],
          courseId: os,
          title: 'Lecture',
          dayOfWeek: 3,
          startTime: '14:30',
          endTime: '15:50',
          location: 'SITE · Room A0150',
        },
        {
          id: demoIds.schedules[7],
          courseId: os,
          title: 'Lab',
          dayOfWeek: 5,
          startTime: '10:00',
          endTime: '11:50',
          location: 'SITE · Lab 2052',
        },
      ];
      for (const schedule of schedules)
        await tx.scheduleEntry.upsert({ where: { id: schedule.id }, update: {}, create: schedule });
      await tx.settings.upsert({
        where: { id: 'preferences' },
        create: { id: 'preferences' },
        update: {},
      });
    },
    { timeout: 30_000 },
  );
  console.log(
    'Demo workspace ready: 4 courses, 18 assessments, 8 tasks. Existing entries were preserved.',
  );
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
