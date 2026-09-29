import type { Assessment } from './types';

export interface GradeSummary {
  /** Weighted average on graded work only; null when no weighted work is graded. */
  currentGrade: number | null;
  /** Percentage points of the full course that have a valid recorded grade. */
  completedWeight: number;
  /** Percentage points earned toward the final course grade. */
  earnedPoints: number;
  remainingWeight: number;
  configuredWeight: number;
  warnings: string[];
}

export interface TargetResult extends GradeSummary {
  target: number;
  requiredAverage: number | null;
  status: 'possible' | 'impossible' | 'secured' | 'invalid';
  assumption: string;
}

const EPSILON = 0.000001;
const validWeight = (assessment: Assessment) =>
  Number.isFinite(assessment.weight) && assessment.weight >= 0;
const validGrade = (assessment: Assessment) =>
  assessment.score !== null &&
  Number.isFinite(assessment.score) &&
  assessment.score >= 0 &&
  Number.isFinite(assessment.maxScore) &&
  assessment.maxScore > 0;
const displayWeight = (value: number) => Number(value.toFixed(2));

export function calculateGrades(assessments: readonly Assessment[]): GradeSummary {
  let configuredWeight = 0;
  let completedWeight = 0;
  let earnedPoints = 0;
  const warnings: string[] = [];

  for (const assessment of assessments) {
    if (!validWeight(assessment)) {
      warnings.push(`“${assessment.name}” has an invalid weight and was excluded.`);
      continue;
    }
    configuredWeight += assessment.weight;
    if (assessment.status !== 'GRADED') continue;
    if (!validGrade(assessment)) {
      warnings.push(
        `“${assessment.name}” needs a valid score and maximum score before it counts as graded.`,
      );
      continue;
    }
    completedWeight += assessment.weight;
    earnedPoints += ((assessment.score as number) / assessment.maxScore) * assessment.weight;
  }

  if (configuredWeight < 100 - EPSILON) {
    warnings.push(
      `Assessment weights total ${displayWeight(configuredWeight)}%. Add the remaining ${displayWeight(100 - configuredWeight)}% for a complete course plan.`,
    );
  } else if (configuredWeight > 100 + EPSILON) {
    warnings.push(
      `Assessment weights total ${displayWeight(configuredWeight)}%, exceeding 100%. Correct the weights before using the target calculator.`,
    );
  }

  return {
    currentGrade: completedWeight > 0 ? (earnedPoints / completedWeight) * 100 : null,
    completedWeight,
    earnedPoints,
    remainingWeight: Math.max(0, 100 - completedWeight),
    configuredWeight,
    warnings,
  };
}

export function calculateTarget(assessments: readonly Assessment[], target: number): TargetResult {
  const summary = calculateGrades(assessments);
  const missingWeight = Math.max(0, 100 - summary.configuredWeight);
  const assumption =
    missingWeight > EPSILON
      ? `Assumes the unconfigured ${displayWeight(missingWeight)}% will be assessed, bringing the course total to 100%. The required average applies to all ${displayWeight(summary.remainingWeight)}% remaining.`
      : 'Assumes the course weights total 100% and remaining work can earn up to 100%, with no extra credit or dropped assessments.';
  const result = { ...summary, target, assumption };

  if (
    !Number.isFinite(target) ||
    target < 0 ||
    target > 100 ||
    summary.configuredWeight > 100 + EPSILON ||
    assessments.some(
      (assessment) =>
        !validWeight(assessment) || (assessment.status === 'GRADED' && !validGrade(assessment)),
    )
  ) {
    return { ...result, status: 'invalid', requiredAverage: null };
  }
  if (summary.earnedPoints >= target - EPSILON) {
    return { ...result, status: 'secured', requiredAverage: 0 };
  }
  if (summary.remainingWeight <= EPSILON) {
    return { ...result, status: 'impossible', requiredAverage: null };
  }
  const requiredAverage = ((target - summary.earnedPoints) / summary.remainingWeight) * 100;
  return {
    ...result,
    requiredAverage,
    status: requiredAverage > 100 + EPSILON ? 'impossible' : 'possible',
  };
}
