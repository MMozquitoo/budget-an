/**
 * Pure savings-goal logic — no database, no dates.
 *
 * A SavingsGoal is a cumulative target with a deadline ("10 000€ pour décembre"),
 * distinct from Budget's per-month ceiling/target. Like Budget, it stores no
 * running total: progress is always the sum of matching PersonalTransaction rows
 * at read time, computed here from that sum plus the goal's own fields.
 */

export type GoalHealth = "met" | "on-track" | "behind" | "overdue";

export interface SavingsGoalLike {
  targetAmount: number;
  targetDate: Date;
  startDate: Date;
}

export interface GoalProgress {
  saved: number;
  /** targetAmount - saved, floored at 0 once met. */
  remaining: number;
  /** saved / targetAmount as a percentage (uncapped; callers clamp for a bar). */
  pct: number;
  health: GoalHealth;
  /** targetDate - now, in days. Negative once overdue. */
  daysRemaining: number;
  /** Linear expectation at `now` used to decide on-track vs behind. */
  expectedByNow: number;
}

/**
 * Categories whose transactions count toward a goal: the one chosen, or the
 * whole SAVINGS group. `categoriesByGroup` comes from the dynamic taxonomy
 * (lib/taxonomy.ts).
 */
export function categoriesForGoal(category: string | null, categoriesByGroup: Record<string, string[]>): string[] {
  return category ? [category] : (categoriesByGroup.SAVINGS ?? []);
}

export function isSavingsCategory(category: string, categoriesByGroup: Record<string, string[]>): boolean {
  return (categoriesByGroup.SAVINGS ?? []).includes(category);
}

const MS_PER_DAY = 86_400_000;
/** How close to the straight-line trajectory still counts as "on track". */
const ON_TRACK_TOLERANCE = 0.9;

export function computeProgress(
  goal: SavingsGoalLike,
  saved: number,
  now: Date = new Date()
): GoalProgress {
  const { targetAmount, targetDate, startDate } = goal;

  const totalDays = Math.max((targetDate.getTime() - startDate.getTime()) / MS_PER_DAY, 0);
  const elapsedDaysRaw = (now.getTime() - startDate.getTime()) / MS_PER_DAY;
  const elapsedDays = Math.min(Math.max(elapsedDaysRaw, 0), totalDays);
  const elapsedFraction = totalDays > 0 ? elapsedDays / totalDays : 1;

  const expectedByNow = targetAmount * elapsedFraction;
  const pct = targetAmount > 0 ? (saved / targetAmount) * 100 : saved > 0 ? 100 : 0;
  const met = saved >= targetAmount;
  const overdue = !met && now.getTime() > targetDate.getTime();

  let health: GoalHealth;
  if (met) health = "met";
  else if (overdue) health = "overdue";
  else health = saved >= expectedByNow * ON_TRACK_TOLERANCE ? "on-track" : "behind";

  return {
    saved,
    remaining: Math.max(targetAmount - saved, 0),
    pct,
    health,
    daysRemaining: Math.ceil((targetDate.getTime() - now.getTime()) / MS_PER_DAY),
    expectedByNow,
  };
}

export interface SavingsGoalRecord {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: Date;
  startDate: Date;
  category: string | null;
}

export type SavingsGoalLine = SavingsGoalRecord & GoalProgress;

/**
 * Merge goal rows with their saved totals (summed server-side per goal, from
 * PersonalTransaction). Sorted by soonest deadline first.
 */
export function buildGoalReport(
  goals: SavingsGoalRecord[],
  savedByGoalId: Record<string, number>,
  now: Date = new Date()
): SavingsGoalLine[] {
  return goals
    .map((g) => ({ ...g, ...computeProgress(g, savedByGoalId[g.id] ?? 0, now) }))
    .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
}
