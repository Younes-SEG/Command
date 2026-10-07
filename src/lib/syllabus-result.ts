import { z } from 'zod';
import type { SyllabusSuggestion } from './syllabus';

export const syllabusResultSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            name: z.string().min(1).max(200),
            type: z.enum([
              'ASSIGNMENT',
              'LAB',
              'QUIZ',
              'MIDTERM',
              'FINAL_EXAM',
              'PROJECT',
              'OTHER',
            ]),
            date: z.string().max(10).nullable(),
            time: z.string().max(5).nullable(),
            weight: z.number().min(0).max(100).nullable(),
            source: z.string().max(1200),
            page: z.number().int().min(1).max(60).nullable(),
            warnings: z.array(z.string().max(400)).max(10),
            grouped: z.boolean(),
          })
          .strict(),
      )
      .max(100),
    warnings: z.array(z.string().max(400)).max(20),
  })
  .strict();

export interface SyllabusPreview {
  items: SyllabusSuggestion[];
  warnings: string[];
}

// The service adds validation warnings and normalizes unknown dates/times to empty strings.
export const syllabusPreviewSchema = syllabusResultSchema.extend({
  items: z
    .array(
      syllabusResultSchema.shape.items.element.extend({
        date: z.string().regex(/^(?:\d{4}-\d{2}-\d{2})?$/),
        time: z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d)?$/),
        warnings: z.array(z.string().max(400)).max(20),
      }),
    )
    .max(100),
});

export function validateSyllabusResult(
  raw: unknown,
  context: { startDate: string; endDate: string; pages: number | null },
): SyllabusPreview {
  const result = syllabusResultSchema.parse(raw);
  return {
    warnings: result.warnings,
    items: result.items.map((item) => {
      const warnings = [...item.warnings];
      let date = item.date || '';
      let time = item.time || '';
      if (date) {
        const parsed = new Date(`${date}T00:00:00Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== date
        ) {
          date = '';
          warnings.push(
            'The suggested date was invalid. Enter the correct date from your syllabus.',
          );
        } else if (date < context.startDate || date > context.endDate)
          warnings.push('Date falls outside the selected course semester.');
      }
      if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        time = '';
        warnings.push('The suggested time was invalid. Check the source.');
      }
      if (!date) warnings.push('No definite due date. Add one when your instructor confirms it.');
      else if (!time)
        warnings.push('No time found. A date without a time uses 23:59 in your device time zone.');
      const weight = item.grouped ? null : item.weight;
      if (item.grouped)
        warnings.push(
          'Grouped or conditional grading: review individual weights before including this row.',
        );
      else if (weight === null)
        warnings.push('No definite weight. Blank weight means 0% for a new assessment.');
      let page = item.page;
      if (page !== null && (context.pages === null || page > context.pages)) {
        page = null;
        warnings.push('The source page could not be verified. Check the original document.');
      }
      if (!item.source.trim())
        warnings.push('No supporting excerpt returned. Verify this assessment in the original.');
      return {
        ...item,
        name: item.name.trim(),
        date,
        time,
        weight,
        page,
        warnings: [...new Set(warnings)],
      };
    }),
  };
}
