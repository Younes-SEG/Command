import { z } from 'zod';

const text = (maximum = 200) => z.string().trim().min(1, 'This field is required.').max(maximum);
const notes = z.string().max(20_000).default('');
const link = z.string().trim().min(1).max(200);
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Choose a valid six-digit color.')
  .default('#5b67e8');
const timestamp = z.union([
  z.date(),
  z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
]);
const dueDate = timestamp.nullable().default(null);
const dateOnly = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, 'Enter a valid calendar date.')
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
);
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a time in HH:mm format.');

export const semesterSchema = z
  .object({
    name: text(80),
    startDate: dateOnly,
    endDate: dateOnly,
    isActive: z.boolean().default(false),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'The semester must end on or after its start date.',
    path: ['endDate'],
  });

export const courseSchema = z.object({
  code: text(30).transform((value) => value.toUpperCase()),
  name: text(),
  semesterId: link,
  instructor: z.string().trim().max(200).nullable().default(null),
  color,
  notes,
  archived: z.boolean().default(false),
});

export const assessmentSchema = z
  .object({
    courseId: link,
    name: text(),
    type: z
      .enum(['ASSIGNMENT', 'LAB', 'QUIZ', 'MIDTERM', 'FINAL_EXAM', 'PROJECT', 'OTHER'])
      .default('ASSIGNMENT'),
    dueDate,
    weight: z.number().finite().min(0).max(100).default(0),
    score: z.number().finite().min(0).nullable().default(null),
    maxScore: z.number().finite().positive().max(1_000_000).default(100),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED']).default('NOT_STARTED'),
    notes,
  })
  .superRefine((value, ctx) => {
    if (value.score !== null && value.score > value.maxScore)
      ctx.addIssue({
        code: 'custom',
        message: 'The score cannot exceed the maximum score.',
        path: ['score'],
      });
    if (value.status === 'GRADED' && value.score === null)
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a score for a graded assessment.',
        path: ['score'],
      });
    if (value.status !== 'GRADED' && value.score !== null)
      ctx.addIssue({
        code: 'custom',
        message: 'Mark the assessment as graded when entering a score.',
        path: ['status'],
      });
  });

export const taskSchema = z.object({
  title: text(),
  description: notes,
  dueDate,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  estimatedMinutes: z.number().int().min(1).max(10_080).nullable().default(null),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED'),
  courseId: link.nullable().default(null),
  assessmentId: link.nullable().default(null),
  subtasks: z
    .array(z.object({ id: link.optional(), title: text(), completed: z.boolean().default(false) }))
    .max(100)
    .default([]),
});

export const eventSchema = z
  .object({
    title: text(),
    description: notes,
    startAt: timestamp,
    endAt: timestamp,
    allDay: z.boolean().default(false),
    location: z.string().trim().max(300).default(''),
    courseId: link.nullable().default(null),
    color,
  })
  .refine((value) => (value.allDay ? value.endAt > value.startAt : value.endAt >= value.startAt), {
    message: 'The event cannot end before it starts.',
    path: ['endAt'],
  });

export const scheduleSchema = z
  .object({
    courseId: link,
    title: text(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
    location: z.string().trim().max(300).default(''),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: 'The class must end after it starts on the same day.',
    path: ['endTime'],
  });

export const settingsSchema = z.object({
  displayName: z.string().trim().max(80).default(''),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).default('SYSTEM'),
  timeFormat: z.enum(['12', '24']).default('12'),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
  showCompleted: z.boolean().default(false),
  studyBuddy: z.enum(['CAT', 'SPROUT', 'CLOUD', 'NONE']).default('CAT'),
  buddyMotion: z.boolean().default(true),
});
