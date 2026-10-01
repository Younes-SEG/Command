'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  ListChecks,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Timer,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/components/workspace-provider';
import { dueLabel, formatTime, isOverdue } from '@/lib/dates';
import { filterTasks, sortTasks, type TaskSort, type TaskView } from '@/lib/tasks';
import type { Priority, Task, TaskStatus } from '@/lib/types';
import { statusLabel } from '@/components/editors/fields';

const views: { id: TaskView; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All tasks' },
];
const sortOptions: { id: string; label: string; sort: TaskSort; direction: 'asc' | 'desc' }[] = [
  { id: 'due-asc', label: 'Due date · earliest first', sort: 'due', direction: 'asc' },
  { id: 'due-desc', label: 'Due date · latest first', sort: 'due', direction: 'desc' },
  { id: 'priority-asc', label: 'Priority · highest first', sort: 'priority', direction: 'asc' },
  { id: 'priority-desc', label: 'Priority · lowest first', sort: 'priority', direction: 'desc' },
  { id: 'created-asc', label: 'Recently created', sort: 'created', direction: 'asc' },
  { id: 'created-desc', label: 'Oldest created', sort: 'created', direction: 'desc' },
  { id: 'title-asc', label: 'Title · A–Z', sort: 'title', direction: 'asc' },
  { id: 'title-desc', label: 'Title · Z–A', sort: 'title', direction: 'desc' },
];

export function TasksView() {
  const { data, now, save, openEditor } = useWorkspace();
  const [view, setView] = useState<TaskView>('today');
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('all');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [sortId, setSortId] = useState('due-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const sort = sortOptions.find((option) => option.id === sortId) ?? sortOptions[0];
  const filterCount =
    Number(courseId !== 'all') +
    Number(priority !== 'all') +
    Number(status !== 'all') +
    Number(Boolean(dueFrom || dueTo));
  const hasFilters = filterCount > 0 || Boolean(search);
  const filtered = filterTasks(
    data.tasks,
    {
      view,
      courseId: courseId === 'personal' ? null : courseId,
      priority,
      status,
      search,
      dueFrom: dueFrom || undefined,
      dueTo: dueTo || undefined,
      showCompleted: view === 'all',
    },
    now,
  );
  const tasks = sortTasks(filtered, sort.sort, sort.direction);
  const dateError = dueFrom && dueTo && dueTo < dueFrom;
  const counts = Object.fromEntries(
    views.map((item) => [
      item.id,
      filterTasks(data.tasks, { view: item.id, showCompleted: item.id === 'all' }, now).length,
    ]),
  );
  const openCount = data.tasks.filter((task) => task.status !== 'COMPLETED').length;

  function clearFilters() {
    setSearch('');
    setCourseId('all');
    setPriority('all');
    setStatus('all');
    setDueFrom('');
    setDueTo('');
  }
  async function toggleTask(task: Task) {
    if (pending.has(task.id)) return;
    setPending((ids) => new Set(ids).add(task.id));
    setError('');
    try {
      await save(
        'tasks',
        { status: task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED' },
        task.id,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to update this task. Please try again.',
      );
    } finally {
      setPending((ids) => {
        const next = new Set(ids);
        next.delete(task.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-7">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-2">ONE STEP AT A TIME</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="muted mt-2 text-sm">
            A clear head starts with a clear list. {openCount} {openCount === 1 ? 'task' : 'tasks'}{' '}
            to go.
          </p>
        </div>
        <Button onClick={() => openEditor('tasks')}>
          <Plus size={16} />
          New task
        </Button>
      </header>
      <div className="tabs overflow-x-auto" aria-label="Task views">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab whitespace-nowrap ${view === item.id ? 'active' : ''}`}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
            <span
              className={`ml-2 text-xs ${item.id === 'overdue' && counts[item.id] > 0 ? 'text-[var(--destructive)]' : 'text-[var(--muted-foreground)]'}`}
            >
              {counts[item.id]}
            </span>
          </button>
        ))}
      </div>
      <section className="card overflow-hidden" aria-label="Your tasks">
        <div className="space-y-4 border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={16}
                className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              />
              <Input
                aria-label="Search tasks"
                placeholder="Search tasks…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              aria-expanded={showFilters}
              aria-controls="task-filters"
              onClick={() => setShowFilters((value) => !value)}
            >
              <SlidersHorizontal size={15} />
              Filters
              {filterCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] text-[var(--primary-foreground)]">
                  {filterCount}
                </span>
              )}
              <ChevronDown size={13} className={showFilters ? 'rotate-180' : ''} />
            </Button>
            <select
              className="input w-full sm:w-auto sm:max-w-56"
              aria-label="Sort tasks"
              value={sortId}
              onChange={(event) => setSortId(event.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {showFilters && (
            <div
              id="task-filters"
              className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              <div className="field">
                <Label htmlFor="task-course-filter">Course</Label>
                <select
                  id="task-course-filter"
                  className="input"
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                >
                  <option value="all">All courses</option>
                  <option value="personal">Personal / no course</option>
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="task-priority-filter">Priority</Label>
                <select
                  id="task-priority-filter"
                  className="input"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority | 'all')}
                >
                  <option value="all">All priorities</option>
                  {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="task-status-filter">Status</Label>
                <select
                  id="task-status-filter"
                  className="input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}
                >
                  <option value="all">All statuses</option>
                  {['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="task-date-from">Due from</Label>
                <Input
                  id="task-date-from"
                  type="date"
                  value={dueFrom}
                  onChange={(event) => setDueFrom(event.target.value)}
                  max={dueTo || undefined}
                />
              </div>
              <div className="field">
                <Label htmlFor="task-date-to">Due through</Label>
                <Input
                  id="task-date-to"
                  type="date"
                  value={dueTo}
                  onChange={(event) => setDueTo(event.target.value)}
                  min={dueFrom || undefined}
                />
              </div>
            </div>
          )}
          {hasFilters && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="muted">
                {tasks.length} {tasks.length === 1 ? 'match' : 'matches'}
                {filterCount > 0
                  ? ` · ${filterCount} active ${filterCount === 1 ? 'filter' : 'filters'}`
                  : ''}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--primary)]"
                onClick={clearFilters}
              >
                <X size={12} />
                Clear filters
              </button>
            </div>
          )}
          {dateError && (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              The end of the date range must be on or after its start.
            </p>
          )}
        </div>
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-[var(--destructive)]"
          >
            <p>{error}</p>
            <button type="button" aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}
        {tasks.length ? (
          <ul className="divide-y divide-[var(--border)]">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={pending.has(task.id)}
                onToggle={() => toggleTask(task)}
              />
            ))}
          </ul>
        ) : (
          <div className="empty-state px-6 py-16">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]">
              {view === 'overdue' || view === 'completed' ? (
                <CheckCheck size={26} />
              ) : (
                <ListChecks size={26} />
              )}
            </div>
            <h2 className="text-lg font-semibold">
              {hasFilters
                ? 'No tasks match your filters'
                : view === 'today'
                  ? 'A fresh start for today'
                  : view === 'overdue'
                    ? 'You’re right on track'
                    : view === 'completed'
                      ? 'Small steps add up'
                      : view === 'upcoming'
                        ? 'A little room to plan ahead'
                        : 'Make space for what matters'}
            </h2>
            <p className="muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              {hasFilters
                ? 'Try another search or clear your filters to see more tasks.'
                : view === 'overdue'
                  ? 'No overdue tasks. Enjoy the breathing room.'
                  : view === 'completed'
                    ? 'Completed tasks will collect here as you make progress.'
                    : view === 'today'
                      ? 'Nothing is due today. Choose your next small step.'
                      : 'Capture your next task and give it a place in your week.'}
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={hasFilters ? clearFilters : () => openEditor('tasks')}
            >
              {hasFilters ? <X size={15} /> : <Plus size={15} />}
              {hasFilters ? 'Clear filters' : 'Add a task'}
            </Button>
          </div>
        )}
        {tasks.length > 0 && (
          <div className="muted border-t border-[var(--border)] px-5 py-3 text-xs">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} · Select a title to edit the
            details.
          </div>
        )}
      </section>
    </div>
  );
}

function TaskRow({ task, busy, onToggle }: { task: Task; busy: boolean; onToggle: () => void }) {
  const { data, now, openEditor } = useWorkspace();
  const course = data.courses.find((item) => item.id === task.courseId);
  const completed = task.status === 'COMPLETED';
  const overdue = isOverdue(task.dueDate, task.status, now);
  const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
  const priorityClass = {
    URGENT: 'text-red-600 dark:text-red-400',
    HIGH: 'text-orange-700 dark:text-orange-400',
    MEDIUM: 'text-amber-700 dark:text-amber-400',
    LOW: 'text-[var(--muted-foreground)]',
  }[task.priority];
  return (
    <li className="group flex items-start gap-3 px-4 py-5 transition-colors hover:bg-[var(--muted)]/40 sm:gap-4 sm:px-5">
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={`${completed ? 'Reopen' : 'Complete'} ${task.title}`}
        disabled={busy}
        onClick={onToggle}
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:opacity-50 ${completed ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border-[var(--control-border)] hover:border-[var(--primary)]'}`}
      >
        {busy ? (
          <Loader2 size={12} className="animate-spin" />
        ) : completed ? (
          <Check size={13} />
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className={`text-left text-sm font-medium leading-6 transition-colors hover:text-[var(--primary)] ${completed ? 'text-[var(--muted-foreground)] line-through' : ''}`}
          onClick={() => openEditor('tasks', task.id)}
        >
          {task.title}
        </button>
        <div className="muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          {course ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
              style={{ color: 'var(--foreground)', backgroundColor: `${course.color}15` }}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: course.color }} />
              {course.code}
            </span>
          ) : (
            <span>Personal</span>
          )}
          <span className={`inline-flex items-center gap-1.5 ${priorityClass}`}>
            <span className="size-1.5 rounded-full bg-current" />
            {statusLabel(task.priority)}
          </span>
          {task.status === 'IN_PROGRESS' && (
            <span className="inline-flex items-center gap-1.5">
              <Circle size={11} className="text-[var(--primary)]" />
              In progress
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="inline-flex items-center gap-1">
              <Timer size={12} />
              {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 ? ` ${task.estimatedMinutes % 60}m` : ''}`
                : `${task.estimatedMinutes} min`}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className="inline-flex items-center gap-1"
              aria-label={`${completedSubtasks} of ${task.subtasks.length} subtasks complete`}
            >
              <ListChecks size={13} />
              {completedSubtasks}/{task.subtasks.length}
            </span>
          )}
          <span className={`sm:hidden ${overdue ? 'text-[var(--destructive)]' : ''}`}>
            {overdue ? 'Overdue · ' : ''}
            {dueLabel(task.dueDate, now)}
            {task.dueDate ? `, ${formatTime(task.dueDate, data.settings.timeFormat)}` : ''}
          </span>
        </div>
      </div>
      <div
        className={`hidden shrink-0 pt-1 text-right text-xs sm:block ${overdue ? 'text-[var(--destructive)]' : 'muted'}`}
      >
        <p className="font-medium">
          {overdue ? 'Overdue · ' : ''}
          {dueLabel(task.dueDate, now)}
        </p>
        {task.dueDate && (
          <p className="mt-1.5">{formatTime(task.dueDate, data.settings.timeFormat)}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label={`Edit ${task.title}`}
        onClick={() => openEditor('tasks', task.id)}
      >
        <ArrowUpRight size={16} className="muted" />
      </Button>
    </li>
  );
}
