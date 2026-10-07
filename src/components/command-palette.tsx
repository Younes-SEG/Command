'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckSquare2,
  CornerDownLeft,
  Home,
  GraduationCap,
  CircleHelp,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { useWorkspace } from './workspace-provider';
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, openEditor } = useWorkspace();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onOpenChange]);
  useEffect(() => {
    document
      .getElementById('command-results')
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected, query, open]);
  const actions = [
    {
      id: 'syllabus',
      title: 'Import syllabus',
      group: 'Navigation',
      icon: BookOpen,
      run: () => router.push('/syllabus'),
    },
    {
      id: 'grades',
      title: 'Enter grades',
      group: 'Navigation',
      icon: GraduationCap,
      run: () => router.push('/grades'),
    },
    {
      id: 'guide',
      title: 'Open user guide',
      group: 'Navigation',
      icon: CircleHelp,
      run: () => router.push('/guide'),
    },
    {
      id: 'add-task',
      title: 'Add task',
      group: 'Quick action',
      icon: CheckSquare2,
      run: () => openEditor('tasks'),
    },
    {
      id: 'add-assessment',
      title: 'Add assessment',
      group: 'Quick action',
      icon: Plus,
      run: () => openEditor('assessments'),
    },
    {
      id: 'add-course',
      title: 'Add course',
      group: 'Quick action',
      icon: BookOpen,
      run: () => openEditor('courses'),
    },
    {
      id: 'add-event',
      title: 'Add event',
      group: 'Quick action',
      icon: CalendarDays,
      run: () => openEditor('events'),
    },
    {
      id: 'home',
      title: 'Go to home',
      group: 'Navigation',
      icon: Home,
      run: () => router.push('/'),
    },
    {
      id: 'courses',
      title: 'Go to courses',
      group: 'Navigation',
      icon: BookOpen,
      run: () => router.push('/courses'),
    },
    {
      id: 'calendar',
      title: 'Go to calendar',
      group: 'Navigation',
      icon: CalendarDays,
      run: () => router.push('/calendar'),
    },
    {
      id: 'tasks',
      title: 'Go to tasks',
      group: 'Navigation',
      icon: CheckSquare2,
      run: () => router.push('/tasks'),
    },
    {
      id: 'settings',
      title: 'Go to settings',
      group: 'Navigation',
      icon: Settings2,
      run: () => router.push('/settings'),
    },
    ...data.courses.map((c) => ({
      id: c.id,
      title: `${c.code} · ${c.name}`,
      group: 'Course',
      icon: BookOpen,
      run: () => router.push(`/courses/${c.id}`),
    })),
    ...(query
      ? data.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          group: 'Task',
          icon: CheckSquare2,
          run: () => openEditor('tasks', t.id),
        }))
      : []),
    ...(query
      ? data.assessments.map((a) => ({
          id: a.id,
          title: a.name,
          group: 'Assessment',
          icon: BookOpen,
          run: () => openEditor('assessments', a.id),
        }))
      : []),
  ]
    .filter((action) => action.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30);
  const active = Math.min(selected, Math.max(actions.length - 1, 0));
  const run = (index: number) => {
    const action = actions[index];
    if (action) {
      onOpenChange(false);
      setQuery('');
      setSelected(0);
      action.run();
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setQuery('');
          setSelected(0);
        }
      }}
    >
      <DialogContent className="p-0 overflow-hidden max-w-[590px]">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search, navigate, or add something to your workspace.
        </DialogDescription>
        <div className="flex gap-3 items-center border-b border-border px-5 py-4 pr-12">
          <Search size={19} className="muted" />
          <input
            role="combobox"
            aria-label="Search commands"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={actions[active] ? `cmd-${actions[active].id}` : undefined}
            className="w-full bg-transparent outline-none text-sm"
            placeholder="What would you like to do?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected((active + 1) % Math.max(actions.length, 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected((active - 1 + actions.length) % Math.max(actions.length, 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(active);
              }
            }}
          />
        </div>
        <div
          id="command-results"
          role="listbox"
          aria-label="Commands"
          className="max-h-[50vh] overflow-auto p-2"
        >
          {actions.length ? (
            actions.map((action, index) => (
              <button
                id={`cmd-${action.id}`}
                role="option"
                aria-selected={active === index}
                tabIndex={-1}
                className="command-item"
                key={action.id}
                onMouseMove={() => setSelected(index)}
                onClick={() => run(index)}
              >
                <action.icon size={16} />
                <span className="truncate">{action.title}</span>
                <small>{action.group}</small>
                {active === index && <CornerDownLeft size={13} />}
              </button>
            ))
          ) : (
            <div className="empty-state">No matches. Try a course code or task name.</div>
          )}
        </div>
        <div className="flex gap-4 px-5 py-3 bg-muted/40 border-t border-border text-[10px] muted">
          <span>↑ ↓ to navigate</span>
          <span>↵ to select</span>
          <span className="ml-auto flex gap-1 items-center">
            <ArrowUpRight size={12} />
            Your next step, one shortcut away
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
