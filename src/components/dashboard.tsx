'use client';
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  CheckSquare2,
  Clock3,
  Flag,
  GraduationCap,
  Plus,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { CourseCard } from './course-card';
import { DeadlineList } from './deadline-list';
import {
  addDays,
  dateKey,
  dueLabel,
  formatDate,
  formatTime,
  isOverdue,
  isSameDay,
  startOfDay,
} from '@/lib/dates';
import { getCalendarOccurrences } from '@/lib/calendar';
import { sortTasks } from '@/lib/tasks';
import type { Task } from '@/lib/types';

function FocusTask({ task }: { task: Task }) {
  const { data, save, openEditor, now } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const course = data.courses.find((c) => c.id === task.courseId);
  const done = task.status === 'COMPLETED';
  async function toggle() {
    setBusy(true);
    try {
      await save('tasks', { status: done ? 'NOT_STARTED' : 'COMPLETED' }, task.id);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="focus-row">
      <button
        className={`task-checkbox ${done ? 'checked' : ''}`}
        disabled={busy}
        aria-label={`${done ? 'Uncomplete' : 'Complete'} ${task.title}`}
        onClick={toggle}
      >
        {done && <Check size={12} />}
      </button>
      <div className="min-w-0 flex-1">
        <button
          className={`row-title ${done ? 'line-through muted' : ''}`}
          onClick={() => openEditor('tasks', task.id)}
        >
          {task.title}
        </button>
        <div className="row-meta">
          {course && (
            <>
              <span
                className="course-dot"
                style={{ background: course.color, width: 5, height: 5 }}
              />
              {course.code}
              <span>·</span>
            </>
          )}
          {task.estimatedMinutes && (
            <>
              <Clock3 size={10} />
              {task.estimatedMinutes} min<span>·</span>
            </>
          )}
          <span className={isOverdue(task.dueDate, task.status, now) ? 'text-destructive' : ''}>
            {isOverdue(task.dueDate, task.status, now) ? 'Overdue · ' : ''}
            {dueLabel(task.dueDate, now)}
          </span>
          {task.subtasks.length > 0 && (
            <>
              <span>·</span>
              <CheckCheck size={11} />
              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive mt-1">
            {error}
          </p>
        )}
      </div>
      {['HIGH', 'URGENT'].includes(task.priority) && (
        <Flag
          size={13}
          className={task.priority === 'URGENT' ? 'text-destructive' : 'text-amber-500'}
          aria-label={`${task.priority.toLowerCase()} priority`}
        />
      )}
    </div>
  );
}

export function Dashboard() {
  const { data, now, openEditor } = useWorkspace();
  const [focusView, setFocusView] = useState<'today' | 'upcoming'>('today');
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const activeSemester = data.semesters.find((s) => s.isActive);
  const courses = data.courses.filter(
    (c) => !c.archived && (!activeSemester || c.semesterId === activeSemester.id),
  );
  const archivedIds = new Set(data.courses.filter((c) => c.archived).map((c) => c.id));
  const visibleTasks = data.tasks.filter((t) => !t.courseId || !archivedIds.has(t.courseId));
  const pending = visibleTasks.filter((t) => t.status !== 'COMPLETED');
  const todayTasks = pending.filter((t) => isSameDay(t.dueDate, now));
  const overdue = pending.filter((t) => isOverdue(t.dueDate, t.status, now));
  const focus = sortTasks(
    visibleTasks.filter(
      (t) =>
        (t.status !== 'COMPLETED' || data.settings.showCompleted) &&
        (focusView === 'today'
          ? isSameDay(t.dueDate, now) || isOverdue(t.dueDate, t.status, now)
          : t.dueDate && new Date(t.dueDate) >= tomorrow),
    ),
    'due',
  ).slice(0, 5);
  const allOccurrences = getCalendarOccurrences(data, today, weekEnd);
  const schedule = allOccurrences.filter(
    (o) => ['schedules', 'events'].includes(o.kind) && o.start < tomorrow && o.end > today,
  );
  const activeIds = new Set(courses.map((c) => c.id));
  const assessmentDeadlines = data.assessments.filter(
    (a) => a.dueDate && !['SUBMITTED', 'GRADED'].includes(a.status) && activeIds.has(a.courseId),
  );
  const deadlines = assessmentDeadlines.sort(
    (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
  );
  const exams = deadlines.filter(
    (a) => ['MIDTERM', 'FINAL_EXAM', 'QUIZ'].includes(a.type) && new Date(a.dueDate!) >= now,
  );
  const nextExam = exams[0];
  const dueThisWeek = assessmentDeadlines.filter(
    (a) => new Date(a.dueDate!) >= today && new Date(a.dueDate!) < weekEnd,
  ).length;
  const effort = todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const workload = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      count:
        pending.filter((t) => isSameDay(t.dueDate, date)).length +
        assessmentDeadlines.filter((a) => isSameDay(a.dueDate, date)).length,
    };
  });
  const maximum = Math.max(1, ...workload.map((day) => day.count));
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Sun size={12} />
            <span suppressHydrationWarning>
              {formatDate(now, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 suppressHydrationWarning>
            {greeting}
            {data.settings.displayName ? `, ${data.settings.displayName}` : ''}
            <span className="text-primary">.</span>
          </h1>
          <p>A clear mind starts with a clear day. Let&apos;s make it a good one.</p>
        </div>
        <Button onClick={() => openEditor('tasks')}>
          <Plus />
          Add a task
        </Button>
      </div>
      <div className="stat-grid">
        <Stat
          label="Due today"
          number={todayTasks.length}
          foot={
            overdue.length
              ? `${overdue.length} overdue ${overdue.length === 1 ? 'task needs' : 'tasks need'} attention`
              : 'A fresh start for your day'
          }
          icon={<CheckSquare2 size={14} />}
          alert={overdue.length > 0}
        />
        <Stat
          label="Deadlines this week"
          number={dueThisWeek}
          foot="Assessments in the next 7 days"
          icon={<CalendarDays size={14} />}
        />
        <Stat
          label="Planned focus time"
          number={effort >= 60 ? `${(effort / 60).toFixed(1)}h` : `${effort}m`}
          foot={`${todayTasks.filter((t) => t.estimatedMinutes).length} tasks with time estimates today`}
          icon={<Clock3 size={14} />}
        />
        <Stat
          label="Active courses"
          number={courses.length}
          foot={activeSemester?.name || 'Your academic workspace'}
          icon={<BookOpen size={14} />}
        />
      </div>
      <div className="dashboard-grid">
        <div className="space-y-[22px]">
          <section className="card overflow-hidden">
            <div className="card-heading">
              <h2>
                <CheckSquare2 size={15} className="text-primary" />
                Your focus
              </h2>
              <Link href="/tasks" className="text-link">
                All tasks
                <ArrowRight size={12} />
              </Link>
            </div>
            <div className="px-[23px] pb-3 flex gap-4">
              <button
                className={`text-[10px] pb-1 border-b-2 ${focusView === 'today' ? 'text-primary border-primary' : 'muted border-transparent'}`}
                onClick={() => setFocusView('today')}
              >
                Today & overdue{' '}
                <span className="ml-1 opacity-60">
                  {
                    pending.filter(
                      (t) => isSameDay(t.dueDate, now) || isOverdue(t.dueDate, t.status, now),
                    ).length
                  }
                </span>
              </button>
              <button
                className={`text-[10px] pb-1 border-b-2 ${focusView === 'upcoming' ? 'text-primary border-primary' : 'muted border-transparent'}`}
                onClick={() => setFocusView('upcoming')}
              >
                Upcoming
              </button>
            </div>
            {focus.length ? (
              focus.map((t) => <FocusTask task={t} key={t.id} />)
            ) : (
              <div className="empty-state min-h-48">
                <CheckCheck size={27} strokeWidth={1.3} />
                <strong className="text-foreground font-medium">A little breathing room.</strong>
                <p>
                  {focusView === 'today'
                    ? 'Nothing due today. Plan your next small step.'
                    : 'No upcoming tasks. Add one when you’re ready.'}
                </p>
              </div>
            )}
            <button
              className="w-full flex gap-2 items-center text-[11px] muted px-[23px] py-3.5 border-t border-border hover:text-primary"
              onClick={() => openEditor('tasks', undefined, { dueDate: dayAt(now, 17) })}
            >
              <Plus size={14} />
              Add something to focus on
            </button>
          </section>
          <DeadlineList assessments={deadlines} />
        </div>
        <div className="space-y-[22px]">
          <section className="card pb-4">
            <div className="card-heading">
              <h2>
                <CalendarDays size={15} className="text-primary" />
                Today&apos;s schedule
              </h2>
              <span className="badge">
                {schedule.length} {schedule.length === 1 ? 'event' : 'events'}
              </span>
            </div>
            {schedule.length ? (
              schedule.slice(0, 5).map((item) => (
                <div className="schedule-row" key={item.id}>
                  <div className="schedule-time">
                    {item.allDay ? 'All day' : formatTime(item.start, data.settings.timeFormat)}
                    {!item.allDay && (
                      <div className="mt-1 opacity-50">
                        {formatTime(item.end, data.settings.timeFormat)}
                      </div>
                    )}
                  </div>
                  <button
                    className="schedule-block"
                    style={{ '--course-color': item.color } as CSSProperties}
                    onClick={() => openEditor(item.kind, item.sourceId)}
                  >
                    <p className="text-[11px] font-semibold truncate">{item.title}</p>
                    <div className="text-[9px] muted mt-1.5 truncate">
                      {data.courses.find((c) => c.id === item.courseId)?.code || 'Personal'}
                      {item.location && ` · ${item.location}`}
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state min-h-40">
                <Sun size={25} strokeWidth={1.3} />
                <p>Your schedule is open today.</p>
                <Button size="sm" variant="ghost" onClick={() => openEditor('events')}>
                  <Plus />
                  Plan something
                </Button>
              </div>
            )}
            <Link href="/calendar" className="text-link justify-center w-full mt-4">
              See your week
              <ArrowRight size={12} />
            </Link>
          </section>
          <section className="card pb-5">
            <div className="card-heading">
              <div>
                <h2>Room for what&apos;s next</h2>
                <p className="text-[10px] muted mt-1">Your workload over the next 7 days</p>
              </div>
              <span className="text-[10px] text-primary font-medium">
                {workload.reduce((s, d) => s + d.count, 0)} due
              </span>
            </div>
            <div
              className="workload-bars"
              role="img"
              aria-label={workload
                .map((d) => `${formatDate(d.date, { weekday: 'long' })}: ${d.count} deadlines`)
                .join(', ')}
            >
              {workload.map((day, i) => (
                <div className="workload-column" key={dateKey(day.date)}>
                  <span>{day.count || ''}</span>
                  <div
                    className="workload-bar"
                    style={{ height: `${Math.max(4, (day.count / maximum) * 63)}px` }}
                  />
                  <span className={i === 0 ? '!text-primary font-semibold' : ''}>
                    {i === 0 ? 'Today' : formatDate(day.date, { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border mx-5 text-[9px] muted flex gap-2 items-center">
              <span className="size-1.5 bg-primary rounded-sm" />
              Tasks and assessments due each day
            </div>
          </section>
          {nextExam ? (
            <button
              onClick={() => openEditor('assessments', nextExam.id)}
              className="card w-full text-left p-5 bg-[var(--accent)] border-primary/10"
            >
              <div className="flex gap-2 text-primary text-[9px] uppercase tracking-widest font-semibold mb-3">
                <GraduationCap size={14} />
                Next assessment
              </div>
              <h3 className="text-sm font-semibold mb-2">{nextExam.name}</h3>
              <p className="text-[10px] muted">
                {data.courses.find((c) => c.id === nextExam.courseId)?.code} ·{' '}
                {formatDate(nextExam.dueDate, { month: 'short', day: 'numeric' })} ·{' '}
                {nextExam.weight}% weight
              </p>
            </button>
          ) : (
            <div className="p-5 rounded-xl bg-[var(--accent)] border border-primary/10">
              <Sparkles size={18} className="text-primary mb-3" />
              <p className="text-xs font-medium">Small steps. Steady progress.</p>
              <p className="text-[10px] muted mt-1.5 leading-relaxed">
                Leave a little space in your day for yourself.
              </p>
            </div>
          )}
        </div>
      </div>
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Your semester, at a glance</h2>
          <Link href="/courses" className="text-link">
            All courses
            <ArrowRight size={12} />
          </Link>
        </div>
        {courses.length ? (
          <div className="course-grid !grid-cols-1 sm:!grid-cols-2 min-[1450px]:!grid-cols-4">
            {courses.slice(0, 4).map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <BookOpen size={28} />
            <p>Bring your semester into focus.</p>
            <Button onClick={() => openEditor(data.semesters.length ? 'courses' : 'semesters')}>
              <Plus />
              {data.semesters.length ? 'Add your first course' : 'Create your semester'}
            </Button>
          </div>
        )}
      </section>
      <footer className="mt-9 flex justify-between text-[9px] muted">
        <span>A little more organized. A little more you.</span>
        <span className="flex gap-1.5 items-center">
          <span className="size-1.5 rounded-full bg-[var(--green)]" />
          Your personal workspace
        </span>
      </footer>
    </>
  );
}
function Stat({
  label,
  number,
  foot,
  icon,
  alert = false,
}: {
  label: string;
  number: string | number;
  foot: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        {label}
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className="stat-number">{number}</strong>
      <p className={`stat-foot ${alert ? '!text-destructive' : ''}`}>{foot}</p>
    </div>
  );
}
function dayAt(date: Date, hour: number) {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result.toISOString();
}
