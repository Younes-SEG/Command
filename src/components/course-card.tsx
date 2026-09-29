'use client';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, CalendarClock } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import type { Course } from '@/lib/types';
import { calculateGrades } from '@/lib/grades';
import { dueLabel } from '@/lib/dates';
export function CourseCard({ course }: { course: Course }) {
  const { data, now } = useWorkspace();
  const assessments = data.assessments.filter((a) => a.courseId === course.id);
  const grade = calculateGrades(assessments);
  const deadlines = assessments
    .filter((a) => a.dueDate && !['GRADED', 'SUBMITTED'].includes(a.status))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  const next = deadlines[0];
  const exam = deadlines.find((a) => ['MIDTERM', 'FINAL_EXAM', 'QUIZ'].includes(a.type));
  return (
    <Link
      className="card course-card block"
      href={`/courses/${course.id}`}
      style={{ '--course-color': course.color } as CSSProperties}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="course-icon">
          <BookOpen size={18} />
        </div>
        <ArrowUpRight size={15} className="muted" />
      </div>
      <div className="text-[10px] font-semibold tracking-wide mb-1" style={{ color: course.color }}>
        {course.code}
        {course.archived && <span className="badge ml-2">Archived</span>}
      </div>
      <h2 className="font-semibold text-[14px] leading-relaxed min-h-11">{course.name}</h2>
      <div className="flex items-end justify-between mt-4 mb-3">
        <div>
          <div className="text-[10px] muted mb-1">Current grade</div>
          <span className="course-grade">
            {grade.currentGrade === null ? '—' : `${grade.currentGrade.toFixed(1)}%`}
          </span>
        </div>
        <span className="text-[9px] muted mb-1">{Math.round(grade.completedWeight)}% graded</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, grade.completedWeight)}%` }}
        />
      </div>
      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[10px] muted">
        <CalendarClock size={12} />
        <span className="truncate flex-1">{next?.name || 'No pending assessments'}</span>
        {next && <span className="shrink-0">{dueLabel(next.dueDate, now)}</span>}
      </div>
      {exam && exam.id !== next?.id && (
        <p className="text-[9px] muted mt-2 truncate">
          Next assessment: {exam.name} · {dueLabel(exam.dueDate, now)}
        </p>
      )}
    </Link>
  );
}
