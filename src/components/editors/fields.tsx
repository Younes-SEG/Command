import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Course } from '@/lib/types';
import { toDateTimeLocal } from '@/lib/dates';

export function Field({
  name,
  label,
  hint,
  children,
  wide,
}: {
  name: string;
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`field ${wide ? 'sm:col-span-2' : ''}`}>
      <Label htmlFor={`editor-${name}`}>{label}</Label>
      {children}
      {hint && <p className="muted text-xs leading-relaxed">{hint}</p>}
    </div>
  );
}

export function TextField({
  name,
  label,
  value,
  required,
  type = 'text',
  min,
  max,
  step,
  hint,
  wide,
  placeholder,
  maxLength = 200,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  required?: boolean;
  type?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  hint?: string;
  wide?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Field name={name} label={label} hint={hint} wide={wide}>
      <Input
        id={`editor-${name}`}
        name={name}
        type={type}
        defaultValue={value ?? ''}
        required={required}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        maxLength={type === 'text' ? maxLength : undefined}
      />
    </Field>
  );
}

export function NotesField({
  name = 'notes',
  label = 'Notes',
  value = '',
  placeholder,
}: {
  name?: string;
  label?: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <Field name={name} label={label} wide>
      <Textarea
        id={`editor-${name}`}
        name={name}
        defaultValue={value}
        rows={4}
        maxLength={20000}
        placeholder={placeholder ?? 'Anything you’d like to remember…'}
      />
    </Field>
  );
}

export function SelectField({
  name,
  label,
  value,
  options,
  required = true,
  onChange,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <Field name={name} label={label}>
      <select
        id={`editor-${name}`}
        name={name}
        className="input"
        required={required}
        {...(onChange
          ? {
              value,
              onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                onChange(event.target.value),
            }
          : { defaultValue: value })}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CourseField({
  courses,
  value,
  required = false,
  onChange,
}: {
  courses: Course[];
  value?: string | null;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <SelectField
      name="courseId"
      label={required ? 'Course' : 'Course (optional)'}
      value={value ?? ''}
      required={required}
      onChange={onChange}
      options={[
        { value: '', label: required ? 'Select a course' : 'No course' },
        ...courses.map((course) => ({
          value: course.id,
          label: `${course.code} · ${course.name}`,
        })),
      ]}
    />
  );
}

export function localDateTime(value?: string | null) {
  return toDateTimeLocal(value);
}

export function localDate(value?: string | null) {
  return localDateTime(value).slice(0, 10);
}

export const statusLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
export const optionsFor = (values: readonly string[]) =>
  values.map((value) => ({ value, label: statusLabel(value) }));
