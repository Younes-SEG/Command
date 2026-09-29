'use client';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Flag } from 'lucide-react';
import type { Assessment } from '@/lib/types';
import { dueLabel, formatDate, isOverdue } from '@/lib/dates';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';

export function DeadlineList({ assessments }: { assessments: Assessment[] }) {
  const { data, now, openEditor } = useWorkspace();
  const overdueCount = assessments.filter((a) => isOverdue(a.dueDate, a.status, now)).length;
  return (
    <section className="card overflow-hidden">
      <div className="card-heading">
        <h2>
          <Flag size={15} className="text-primary" />
          Deadlines ahead
          {overdueCount > 0 && (
            <span className="badge !text-destructive">{overdueCount} overdue</span>
          )}
        </h2>
        <Link href="/calendar" className="text-link">
          Calendar
          <ArrowRight size={12} />
        </Link>
      </div>
      {assessments.length ? (
        assessments.slice(0, 4).map((assessment) => {
          const course = data.courses.find((c) => c.id === assessment.courseId);
          const overdue = isOverdue(assessment.dueDate, assessment.status, now);
          return (
            <button
              key={assessment.id}
              onClick={() => openEditor('assessments', assessment.id)}
              className="deadline-row w-full text-left hover:bg-muted/30"
            >
              <div className="date-tile">
                <span>{formatDate(assessment.dueDate, { month: 'short' })}</span>
                <strong>{formatDate(assessment.dueDate, { day: 'numeric' })}</strong>
              </div>
              <div className="min-w-0 flex-1">
                <div className="row-title truncate">{assessment.name}</div>
                <div className="row-meta">
                  <span
                    className="course-dot"
                    style={{ background: course?.color, width: 5, height: 5 }}
                  />
                  {course?.code}
                  <span>·</span>
                  {assessment.type.toLowerCase().replaceAll('_', ' ')}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] ${overdue ? 'text-destructive' : 'muted'}`}>
                  {overdue ? 'Overdue · ' : ''}
                  {dueLabel(assessment.dueDate, now)}
                </div>
                <div className="text-[9px] muted mt-1">{assessment.weight}% of grade</div>
              </div>
            </button>
          );
        })
      ) : (
        <div className="empty-state">
          <CalendarDays size={25} />
          <p>No deadlines on the horizon.</p>
          <Button variant="outline" size="sm" onClick={() => openEditor('assessments')}>
            Add assessment
          </Button>
        </div>
      )}
      {assessments.length > 4 && (
        <Link
          href="/calendar"
          className="text-link justify-center w-full py-3 border-t border-border"
        >
          {assessments.length - 4} more pending assessments
          <ArrowRight size={12} />
        </Link>
      )}
    </section>
  );
}
