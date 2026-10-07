import type { AssessmentType } from './types';

export interface SyllabusSuggestion {
  name: string;
  type: AssessmentType;
  date: string;
  time: string;
  weight: number | null;
  source: string;
  page?: number | null;
  warnings: string[];
  grouped: boolean;
}

export const assessmentNameKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
