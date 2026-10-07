export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type AssessmentType =
  'ASSIGNMENT' | 'LAB' | 'QUIZ' | 'MIDTERM' | 'FINAL_EXAM' | 'PROJECT' | 'OTHER';
export type AssessmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
export interface Course {
  id: string;
  code: string;
  name: string;
  semesterId: string;
  instructor: string | null;
  color: string;
  notes: string;
  archived: boolean;
}
export interface Assessment {
  id: string;
  courseId: string;
  name: string;
  type: AssessmentType;
  dueDate: string | null;
  weight: number;
  score: number | null;
  maxScore: number;
  status: AssessmentStatus;
  notes: string;
}
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}
export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  estimatedMinutes: number | null;
  status: TaskStatus;
  courseId: string | null;
  assessmentId: string | null;
  subtasks: Subtask[];
  createdAt: string;
  completedAt: string | null;
}
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string;
  courseId: string | null;
  color: string;
}
export interface ScheduleEntry {
  id: string;
  courseId: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
}
export interface Settings {
  id: string;
  displayName: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  timeFormat: '12' | '24';
  weekStartsOn: 0 | 1;
  showCompleted: boolean;
  studyBuddy: 'CAT' | 'SPROUT' | 'CLOUD' | 'NONE';
  buddyMotion: boolean;
}
export interface Workspace {
  hosted?: boolean;
  semesters: Semester[];
  courses: Course[];
  assessments: Assessment[];
  tasks: Task[];
  events: CalendarEvent[];
  schedules: ScheduleEntry[];
  settings: Settings;
}
export type EntityKind =
  'courses' | 'assessments' | 'tasks' | 'events' | 'schedules' | 'semesters' | 'settings';
export type EditorKind = Exclude<EntityKind, 'settings'>;
export interface EditorState {
  kind: EditorKind;
  id?: string;
  defaults?: Record<string, unknown>;
}
