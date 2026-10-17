/**
 * Pickup-and-delivery route planning for one driver.
 *
 * Points are indexes into a travel-time matrix (minutes). Index `start` is the
 * driver's position; an optional `end` is where the driver finishes (their own
 * destination when deliveries ride along on a planned trip). Each job is a pickup (unless already collected) that
 * must precede its delivery. The cost is total driving time plus a heavy
 * penalty per minute late, so deadlines win over small detours.
 */

export interface RouteJob {
  id: string;
  /** Matrix index of the pickup, or null when the food is already on board. */
  pickupIndex: number | null;
  deliveryIndex: number;
  /** Minutes from now until the pickup window closes. */
  pickupDeadlineMinutes?: number | null;
  /** Minutes from now until the food must reach the NGO. */
  deliveryDeadlineMinutes?: number | null;
}

export interface PlannedStop {
  jobId: string;
  kind: "pickup" | "delivery";
  index: number;
  /** Minutes from now when the driver arrives at this stop. */
  arrivalMinutes: number;
  lateMinutes: number;
}

export interface RoutePlan {
  stops: PlannedStop[];
  drivingMinutes: number;
  lateMinutes: number;
  /** drivingMinutes + LATE_PENALTY × lateMinutes; lower is better. */
  cost: number;
  method: "exact" | "greedy" | "given";
  /** Arrival at `end`, when the route has one. */
  endArrivalMinutes?: number;
}

export interface PlanOptions {
  /** Matrix index where the route must finish. */
  end?: number;
}

/** One minute late weighs like ten minutes of extra driving. */
export const LATE_PENALTY = 10;
/** Time spent at each stop (parking, handover, code confirmation). */
export const SERVICE_MINUTES = 5;
/** Exhaustive search up to this many jobs; greedy insertion beyond. */
export const MAX_EXACT_JOBS = 5;

interface Candidate {
  jobId: string;
  kind: "pickup" | "delivery";
  index: number;
  deadline: number | null;
}

function evaluate(
  sequence: readonly Candidate[],
  start: number,
  minutes: readonly (readonly number[])[],
  method: RoutePlan["method"],
  options: PlanOptions = {},
): RoutePlan {
  let position = start;
  let clock = 0;
  let driving = 0;
  let late = 0;
  const stops: PlannedStop[] = [];
  for (const step of sequence) {
    const leg = minutes[position]?.[step.index] ?? Number.POSITIVE_INFINITY;
    driving += leg;
    clock += leg;
    const lateMinutes = step.deadline === null ? 0 : Math.max(0, clock - step.deadline);
    late += lateMinutes;
    stops.push({
      jobId: step.jobId,
      kind: step.kind,
      index: step.index,
      arrivalMinutes: clock,
      lateMinutes,
    });
    clock += SERVICE_MINUTES;
    position = step.index;
  }
  let endArrivalMinutes: number | undefined;
  if (options.end !== undefined) {
    const leg = minutes[position]?.[options.end] ?? Number.POSITIVE_INFINITY;
    driving += leg;
    endArrivalMinutes = clock + leg;
  }
  return {
    stops,
    drivingMinutes: driving,
    lateMinutes: late,
    cost: driving + LATE_PENALTY * late,
    method,
    ...(endArrivalMinutes === undefined ? {} : { endArrivalMinutes }),
  };
}

const candidatesFor = (job: RouteJob) => ({
  pickup:
    job.pickupIndex === null
      ? null
      : ({
          jobId: job.id,
          kind: "pickup",
          index: job.pickupIndex,
          deadline: job.pickupDeadlineMinutes ?? null,
        } satisfies Candidate),
  delivery: {
    jobId: job.id,
    kind: "delivery",
    index: job.deliveryIndex,
    deadline: job.deliveryDeadlineMinutes ?? null,
  } satisfies Candidate,
});

/** Baseline: jobs in the given order, each pickup then its delivery. */
export function planInGivenOrder(
  start: number,
  jobs: readonly RouteJob[],
  minutes: readonly (readonly number[])[],
  options: PlanOptions = {},
): RoutePlan {
  const sequence = jobs.flatMap((job) => {
    const { pickup, delivery } = candidatesFor(job);
    return pickup ? [pickup, delivery] : [delivery];
  });
  return evaluate(sequence, start, minutes, "given", options);
}

function planExact(
  start: number,
  jobs: readonly RouteJob[],
  minutes: readonly (readonly number[])[],
  options: PlanOptions,
): RoutePlan {
  const parts = jobs.map(candidatesFor);
  const total = parts.reduce((count, part) => count + (part.pickup ? 2 : 1), 0);
  let best = planInGivenOrder(start, jobs, minutes, options);
  best = { ...best, method: "exact" };
  const sequence: Candidate[] = [];
  const pickedUp = parts.map((part) => part.pickup === null);
  const delivered = parts.map(() => false);

  const search = (position: number, clock: number, driving: number, late: number) => {
    // Bound: the partial cost already exceeds the best complete plan.
    if (driving + LATE_PENALTY * late >= best.cost) return;
    if (sequence.length === total) {
      const complete = evaluate(sequence, start, minutes, "exact", options);
      if (complete.cost < best.cost) best = complete;
      return;
    }
    for (let job = 0; job < parts.length; job += 1) {
      const part = parts[job]!;
      const next = !pickedUp[job] ? part.pickup! : !delivered[job] ? part.delivery : null;
      if (!next) continue;
      const leg = minutes[position]?.[next.index] ?? Number.POSITIVE_INFINITY;
      const arrival = clock + leg;
      const lateHere = next.deadline === null ? 0 : Math.max(0, arrival - next.deadline);
      const wasPickup = !pickedUp[job];
      if (wasPickup) pickedUp[job] = true;
      else delivered[job] = true;
      sequence.push(next);
      search(next.index, arrival + SERVICE_MINUTES, driving + leg, late + lateHere);
      sequence.pop();
      if (wasPickup) pickedUp[job] = false;
      else delivered[job] = false;
    }
  };
  search(start, 0, 0, 0);
  return best;
}

function planGreedy(
  start: number,
  jobs: readonly RouteJob[],
  minutes: readonly (readonly number[])[],
  options: PlanOptions,
): RoutePlan {
  // Nearest feasible next stop, preferring stops whose deadline is at risk.
  const parts = jobs.map(candidatesFor);
  const pickedUp = parts.map((part) => part.pickup === null);
  const delivered = parts.map(() => false);
  const sequence: Candidate[] = [];
  let position = start;
  let clock = 0;
  while (delivered.some((done) => !done)) {
    let choice: { job: number; candidate: Candidate; score: number } | null = null;
    parts.forEach((part, job) => {
      const candidate = !pickedUp[job] ? part.pickup! : !delivered[job] ? part.delivery : null;
      if (!candidate) return;
      const leg = minutes[position]?.[candidate.index] ?? Number.POSITIVE_INFINITY;
      const slack = candidate.deadline === null ? Number.POSITIVE_INFINITY : candidate.deadline - (clock + leg);
      const score = leg + (slack < 30 ? -LATE_PENALTY * (30 - slack) : 0);
      if (!choice || score < choice.score) choice = { job, candidate, score };
    });
    const picked = choice as { job: number; candidate: Candidate } | null;
    if (!picked) break;
    sequence.push(picked.candidate);
    if (!pickedUp[picked.job]) pickedUp[picked.job] = true;
    else delivered[picked.job] = true;
    clock += (minutes[position]?.[picked.candidate.index] ?? 0) + SERVICE_MINUTES;
    position = picked.candidate.index;
  }
  return evaluate(sequence, start, minutes, "greedy", options);
}

/** Best stop order for the driver's jobs (never worse than the given order). */
export function planDeliveryRoute(
  start: number,
  jobs: readonly RouteJob[],
  minutes: readonly (readonly number[])[],
  options: PlanOptions = {},
): RoutePlan {
  if (jobs.length === 0) return evaluate([], start, minutes, "exact", options);
  const given = planInGivenOrder(start, jobs, minutes, options);
  const optimized =
    jobs.length <= MAX_EXACT_JOBS
      ? planExact(start, jobs, minutes, options)
      : planGreedy(start, jobs, minutes, options);
  return optimized.cost <= given.cost ? optimized : given;
}
