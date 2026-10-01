import type { Assessment, Task, Workspace } from '../src/lib/types';

export function assessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    courseId: 'course-1',
    name: 'Midterm',
    type: 'MIDTERM',
    dueDate: null,
    weight: 20,
    score: null,
    maxScore: 100,
    status: 'NOT_STARTED',
    notes: '',
    ...overrides,
  };
}

export function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Review chapter',
    description: '',
    dueDate: null,
    priority: 'MEDIUM',
    estimatedMinutes: null,
    status: 'NOT_STARTED',
    courseId: null,
    assessmentId: null,
    subtasks: [],
    createdAt: '2026-09-01T12:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

export function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    semesters: [
      {
        id: 'semester-1',
        name: 'Winter 2026',
        startDate: '2026-01-05',
        endDate: '2026-04-30',
        isActive: true,
      },
    ],
    courses: [
      {
        id: 'course-1',
        code: 'SEG3101',
        name: 'Software Requirements',
        semesterId: 'semester-1',
        instructor: null,
        color: '#34d399',
        notes: '',
        archived: false,
      },
    ],
    assessments: [],
    tasks: [],
    events: [],
    schedules: [],
    settings: {
      id: 'settings',
      displayName: 'Alex',
      theme: 'SYSTEM',
      timeFormat: '24',
      weekStartsOn: 1,
      showCompleted: false,
      studyBuddy: 'CAT',
      buddyMotion: true,
    },
    ...overrides,
  };
}
