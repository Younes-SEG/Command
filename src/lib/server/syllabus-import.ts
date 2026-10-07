import { z } from 'zod';
import { assessmentSchema } from './validation';
import { transaction } from './mutations';
import { ApiError } from './errors';
import { assessmentNameKey } from '../syllabus';
import { requireWorkspaceId } from './auth';

const schema = z.object({
  courseId: z.string().min(1).max(200),
  reviewed: z.literal(true, 'Review the suggestions before saving.'),
  items: z
    .array(
      z.object({
        existingId: z.string().min(1).max(200).nullable(),
        name: z.string().trim().min(1).max(200),
        type: z.enum(['ASSIGNMENT', 'LAB', 'QUIZ', 'MIDTERM', 'FINAL_EXAM', 'PROJECT', 'OTHER']),
        dueDate: z.string().datetime({ offset: true }).nullable(),
        weight: z.number().finite().min(0).max(100).nullable(),
        source: z.string().max(2000),
      }),
    )
    .min(1)
    .max(100),
});

export async function importSyllabus(body: unknown) {
  const workspaceId = await requireWorkspaceId();
  const { courseId, items } = schema.parse(body);
  return transaction(async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: courseId, semester: { workspaceId } },
    });
    if (!course) throw new ApiError(404, 'This course no longer exists.');
    const current = await tx.assessment.findMany({ where: { courseId } });
    const usedIds = new Set<string>();
    const names = new Set(current.map((item) => assessmentNameKey(item.name)));
    let total = current.reduce((sum, item) => sum + item.weight, 0);
    const changes = items.map((item) => {
      const existing = item.existingId ? current.find((a) => a.id === item.existingId) : null;
      if (item.existingId && !existing)
        throw new ApiError(
          409,
          'A matched assessment is missing or belongs to another course. Review the matches again.',
        );
      if (existing) {
        if (usedIds.has(existing.id))
          throw new ApiError(400, 'Match each existing assessment only once.');
        usedIds.add(existing.id);
      } else {
        const key = assessmentNameKey(item.name);
        if (!key) throw new ApiError(400, 'Give each assessment a descriptive name.');
        if (names.has(key))
          throw new ApiError(
            409,
            `“${item.name}” already exists or appears twice. Match it to the existing assessment, deselect it, or give it a distinct name.`,
          );
        names.add(key);
      }
      const weight = item.weight ?? existing?.weight ?? 0;
      total += weight - (existing?.weight ?? 0);
      const dueDate = item.dueDate ? new Date(item.dueDate) : (existing?.dueDate ?? null);
      const data = assessmentSchema.parse({
        ...(existing ?? {}),
        courseId,
        name: existing?.name ?? item.name,
        type: existing?.type ?? item.type,
        weight,
        dueDate,
        notes:
          existing?.notes ??
          (item.source
            ? `Imported from syllabus. Verify against the course outline.\n\n${item.source}`
            : ''),
      });
      return { existing, data };
    });
    if (total > 100 + 0.000001)
      throw new ApiError(
        400,
        `These weights would total ${total.toFixed(2)}%. Adjust the selected rows or existing course weights so the total is at most 100%. Nothing was saved.`,
      );
    for (const { existing, data } of changes) {
      if (existing)
        await tx.assessment.update({
          where: { id: existing.id },
          data: { dueDate: data.dueDate, weight: data.weight },
        });
      else await tx.assessment.create({ data });
    }
    return { created: changes.filter((item) => !item.existing).length, updated: usedIds.size };
  });
}
