import { describe, expect, it } from 'vitest';
import { calculateGrades, calculateTarget } from '../src/lib/grades';
import { assessment } from './fixtures';

describe('weighted course grades', () => {
  it('uses only graded weight, preserving zero scores and excluding entered but ungraded scores', () => {
    const result = calculateGrades([
      assessment({ weight: 20, score: 40, maxScore: 50, status: 'GRADED' }),
      assessment({ id: 'zero', weight: 10, score: 0, status: 'GRADED' }),
      assessment({ id: 'submitted', weight: 30, score: 100, status: 'SUBMITTED' }),
      assessment({ id: 'final', weight: 40 }),
    ]);
    expect(result.currentGrade).toBeCloseTo(53.333333);
    expect(result.completedWeight).toBe(30);
    expect(result.earnedPoints).toBe(16);
    expect(result.remainingWeight).toBe(70);
    expect(result.configuredWeight).toBe(100);
    expect(result.warnings).toEqual([]);
  });

  it('does not imply a grade for no work or zero-weight work', () => {
    expect(calculateGrades([]).currentGrade).toBeNull();
    expect(
      calculateGrades([assessment({ weight: 0, score: 80, status: 'GRADED' })]).currentGrade,
    ).toBeNull();
    expect(
      calculateGrades([assessment({ weight: 50, score: 0, status: 'GRADED' })]).currentGrade,
    ).toBe(0);
  });

  it('excludes malformed grade records and exposes incomplete course weights', () => {
    const result = calculateGrades([
      assessment({ score: null, status: 'GRADED' }),
      assessment({ id: 'bad-max', score: 20, maxScore: 0, status: 'GRADED' }),
      assessment({ id: 'bad-weight', weight: -20, score: 50, status: 'GRADED' }),
    ]);
    expect(result.currentGrade).toBeNull();
    expect(result.completedWeight).toBe(0);
    expect(result.configuredWeight).toBe(40);
    expect(result.warnings).toHaveLength(4);
  });
});

describe('target grades', () => {
  it('calculates the remaining average without confusing current grade with earned final points', () => {
    const result = calculateTarget(
      [
        assessment({ weight: 40, score: 90, status: 'GRADED' }),
        assessment({ id: 'final', weight: 60 }),
      ],
      80,
    );
    expect(result.currentGrade).toBe(90);
    expect(result.earnedPoints).toBe(36);
    expect(result.requiredAverage).toBeCloseTo(73.333333);
    expect(result.status).toBe('possible');
  });

  it('identifies impossible targets and already secured targets', () => {
    const assessments = [
      assessment({ weight: 80, score: 75, status: 'GRADED' }),
      assessment({ weight: 20 }),
    ];
    expect(calculateTarget(assessments, 85)).toMatchObject({
      status: 'impossible',
      requiredAverage: 125,
    });
    expect(calculateTarget(assessments, 60)).toMatchObject({
      status: 'secured',
      requiredAverage: 0,
    });
    expect(
      calculateTarget([assessment({ weight: 100, score: 79, status: 'GRADED' })], 80),
    ).toMatchObject({ status: 'impossible', requiredAverage: null });
    expect(
      calculateTarget([assessment({ weight: 100, score: 80, status: 'GRADED' })], 80),
    ).toMatchObject({ status: 'secured', requiredAverage: 0 });
  });

  it('explicitly accounts for unconfigured weight, including an empty course', () => {
    const result = calculateTarget([assessment({ weight: 20, score: 100, status: 'GRADED' })], 80);
    expect(result.requiredAverage).toBe(75);
    expect(result.assumption).toContain('unconfigured 80%');
    expect(calculateTarget([], 80)).toMatchObject({
      requiredAverage: 80,
      status: 'possible',
      remainingWeight: 100,
    });
    expect(calculateTarget([], 0).status).toBe('secured');
  });

  it('rejects overallocated weights, invalid graded records, and out-of-range targets', () => {
    expect(calculateTarget([assessment({ weight: 101 })], 80).status).toBe('invalid');
    expect(calculateTarget([assessment({ status: 'GRADED', score: null })], 80).status).toBe(
      'invalid',
    );
    for (const target of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateTarget([], target)).toMatchObject({
        status: 'invalid',
        requiredAverage: null,
      });
    }
  });
});
