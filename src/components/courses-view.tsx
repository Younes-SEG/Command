'use client';
import { useState } from 'react';
import { BookOpen, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { CourseCard } from './course-card';
import { Button } from './ui/button';
export function CoursesView() {
  const { data, openEditor } = useWorkspace();
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState(
    () => data.semesters.find((s) => s.isActive)?.id || 'all',
  );
  const [archived, setArchived] = useState(false);
  const courses = data.courses.filter(
    (c) =>
      (semester === 'all' || c.semesterId === semester) &&
      (!c.archived || archived) &&
      `${c.code} ${c.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">A place for every subject</div>
          <h1>Your courses</h1>
          <p>Keep the big picture in view, and the details in their place.</p>
        </div>
        <Button
          onClick={() =>
            openEditor(
              'courses',
              undefined,
              semester !== 'all' ? { semesterId: semester } : undefined,
            )
          }
        >
          <Plus />
          Add course
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-7">
        <div className="relative max-w-xs flex-1 min-w-44">
          <Search size={15} className="absolute left-3 top-3 muted" />
          <input
            className="input pl-9"
            aria-label="Search courses"
            placeholder="Find a course…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input w-auto min-w-40"
          aria-label="Filter by semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        >
          <option value="all">All semesters</option>
          {data.semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-xs muted cursor-pointer">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          <SlidersHorizontal size={13} />
          Show archived
        </label>
      </div>
      {courses.length ? (
        <>
          <div className="eyebrow mb-4">
            {courses.length} {courses.length === 1 ? 'course' : 'courses'} in your workspace
          </div>
          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <p className="text-[10px] muted mt-6 flex gap-2 items-center">
            <span className="size-1 rounded-full bg-primary mt-1" />
            Current grades reflect only graded work, weighted by its contribution to the course.
          </p>
        </>
      ) : (
        <div className="card empty-state py-20">
          <BookOpen size={30} strokeWidth={1.2} />
          <h2 className="text-lg font-semibold text-foreground">
            {data.courses.length ? 'No courses match this view' : 'Your semester starts here'}
          </h2>
          <p>
            {data.courses.length
              ? 'Try another semester or clear your search.'
              : 'Add a course to bring your assessments, grades, and schedule together.'}
          </p>
          <Button
            className="mt-3"
            onClick={() => openEditor(data.semesters.length ? 'courses' : 'semesters')}
          >
            <Plus />
            {data.semesters.length ? 'Add your first course' : 'Set up your semester'}
          </Button>
        </div>
      )}
    </>
  );
}
