import type { z } from 'zod';
import type { syllabusResultSchema } from '../../src/lib/syllabus-result';
// Synthetic model output. Browser tests never send real syllabi to a paid API.
export const syllabusModelResult: z.infer<typeof syllabusResultSchema> = {
  items: [
    {
      name: 'Midterm 1',
      type: 'MIDTERM',
      date: '2090-10-20',
      time: '14:00',
      weight: 25,
      source: 'Midterm 1 - October 20, 2090 at 14:00 - 25%',
      page: 1,
      warnings: [],
      grouped: false,
    },
    {
      name: 'Assignment 1',
      type: 'ASSIGNMENT',
      date: '2090-11-02',
      time: '23:59',
      weight: 10,
      source: 'Assignment 1 - November 2, 2090 at 23:59 - 10%',
      page: 1,
      warnings: [],
      grouped: false,
    },
    {
      name: 'Quizzes',
      type: 'QUIZ',
      date: null,
      time: null,
      weight: null,
      source: 'Five quizzes worth 20% total',
      page: 1,
      warnings: ['Individual weights are not stated.'],
      grouped: true,
    },
    {
      name: 'Final exam',
      type: 'FINAL_EXAM',
      date: null,
      time: null,
      weight: 35,
      source: 'Final exam - TBD - 35%',
      page: 1,
      warnings: [],
      grouped: false,
    },
  ],
  warnings: [],
};
