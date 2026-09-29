import 'dotenv/config';
import assert from 'node:assert/strict';
import { db } from '../src/lib/server/db';
import { saveEntity, deleteEntity } from '../src/lib/server/mutations';

/** Opt-in integration check against the configured PostgreSQL database. All test entries are removed. */
async function verify() {
  const semester = await saveEntity('semesters', {
    name: 'Temporary verification semester',
    startDate: '2030-01-01',
    endDate: '2030-04-30',
  });
  const taskIds: string[] = [];
  try {
    const first = await saveEntity('courses', {
      name: 'Verification course one',
      code: 'VERIFY1',
      semesterId: semester.id,
    });
    const second = await saveEntity('courses', {
      name: 'Verification course two',
      code: 'VERIFY2',
      semesterId: semester.id,
    });
    const results = await Promise.allSettled([
      saveEntity('assessments', {
        courseId: first.id,
        name: 'Concurrent assessment A',
        weight: 60,
      }),
      saveEntity('assessments', {
        courseId: first.id,
        name: 'Concurrent assessment B',
        weight: 60,
      }),
    ]);
    assert.equal(
      results.filter((result) => result.status === 'fulfilled').length,
      1,
      'Concurrent allocations must not exceed 100%.',
    );
    const assessment = await db.assessment.findFirstOrThrow({ where: { courseId: first.id } });
    await assert.rejects(saveEntity('assessments', { status: 'GRADED' }, assessment.id));
    await saveEntity('assessments', { status: 'GRADED', score: 0 }, assessment.id);
    await assert.rejects(
      saveEntity('tasks', {
        title: 'Invalid relationship',
        courseId: second.id,
        assessmentId: assessment.id,
      }),
    );
    const task = await saveEntity('tasks', {
      title: 'Verification task',
      assessmentId: assessment.id,
      subtasks: [{ title: 'First step' }],
    });
    taskIds.push(task.id);
    let storedTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { subtasks: true },
    });
    assert.equal(storedTask.courseId, first.id, 'Assessment tasks inherit their course.');
    const firstSubtaskId = storedTask.subtasks[0].id;
    await saveEntity(
      'tasks',
      {
        subtasks: [
          { id: firstSubtaskId, title: 'First step done', completed: true },
          { title: 'Second step' },
        ],
      },
      task.id,
    );
    storedTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { subtasks: true },
    });
    assert.equal(storedTask.subtasks.length, 2);
    assert.ok(
      storedTask.subtasks.some((subtask) => subtask.id === firstSubtaskId && subtask.completed),
      'Checklist edits preserve owned subtask identities.',
    );
    await saveEntity('tasks', { status: 'COMPLETED' }, task.id);
    storedTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { subtasks: true },
    });
    assert.ok(storedTask.completedAt);
    assert.equal(storedTask.subtasks.length, 2, 'Partial updates preserve subtasks.');
    await saveEntity('tasks', { status: 'NOT_STARTED' }, task.id);
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: task.id } })).completedAt, null);
    await saveEntity('assessments', { courseId: second.id }, assessment.id);
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: task.id } })).courseId, second.id);
    await assert.rejects(deleteEntity('semesters', semester.id), /courses/);
    await deleteEntity('courses', second.id);
    storedTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { subtasks: true },
    });
    assert.equal(storedTask.courseId, null);
    assert.equal(storedTask.assessmentId, null);
    assert.equal(storedTask.subtasks.length, 2);
    assert.equal(await db.assessment.count({ where: { id: assessment.id } }), 0);
    console.log(
      'PostgreSQL integration checks passed: concurrent weights, grades, task lifecycle, relationships, partial updates, deletion safety.',
    );
  } finally {
    await db.task.deleteMany({ where: { id: { in: taskIds } } });
    await db.course.deleteMany({ where: { semesterId: semester.id } });
    await db.semester.delete({ where: { id: semester.id } });
  }
}

verify()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
