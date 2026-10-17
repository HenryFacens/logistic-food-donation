import { describe, expect, it } from "vitest";
import {
  LATE_PENALTY,
  planDeliveryRoute,
  planInGivenOrder,
  type RouteJob,
} from "../src/routing/plan.js";

// Points on a line (minutes apart): 0 driver, 1 pickup A, 2 pickup B,
// 3 NGO of A, 4 NGO of B. Travel time = distance between positions.
const positions = [0, 10, 12, 30, 32];
const matrix = positions.map((from) => positions.map((to) => Math.abs(from - to)));

describe("delivery route planning", () => {
  it("collects both nearby pickups before driving to the NGOs", () => {
    const jobs: RouteJob[] = [
      { id: "A", pickupIndex: 1, deliveryIndex: 3 },
      { id: "B", pickupIndex: 2, deliveryIndex: 4 },
    ];
    const given = planInGivenOrder(0, jobs, matrix);
    const plan = planDeliveryRoute(0, jobs, matrix);
    expect(plan.stops.map((stop) => `${stop.kind[0]}${stop.jobId}`)).toEqual([
      "pA",
      "pB",
      "dA",
      "dB",
    ]);
    expect(plan.drivingMinutes).toBe(32);
    expect(given.drivingMinutes).toBe(10 + 20 + 18 + 20);
    expect(plan.cost).toBeLessThan(given.cost);
  });

  it("never delivers before collecting", () => {
    const jobs: RouteJob[] = [
      { id: "A", pickupIndex: 3, deliveryIndex: 1 },
      { id: "B", pickupIndex: 4, deliveryIndex: 2 },
    ];
    const plan = planDeliveryRoute(0, jobs, matrix);
    for (const job of ["A", "B"]) {
      const pickup = plan.stops.findIndex((stop) => stop.jobId === job && stop.kind === "pickup");
      const delivery = plan.stops.findIndex((stop) => stop.jobId === job && stop.kind === "delivery");
      expect(pickup).toBeLessThan(delivery);
    }
  });

  it("lets a tight deadline override the shortest path", () => {
    // B is on board and due at its NGO by minute 32: going there first is the
    // only on-time plan, worth more than the shorter A-first route.
    const jobs: RouteJob[] = [
      { id: "A", pickupIndex: 1, deliveryIndex: 3 },
      { id: "B", pickupIndex: null, deliveryIndex: 4, deliveryDeadlineMinutes: 32 },
    ];
    const plan = planDeliveryRoute(0, jobs, matrix);
    expect(plan.lateMinutes).toBe(0);
    expect(plan.stops[0]?.jobId).toBe("B");
    expect(LATE_PENALTY).toBeGreaterThan(1);
  });

  it("handles more jobs than the exact search with a feasible greedy plan", () => {
    const points = Array.from({ length: 15 }, (_, index) => index * 3);
    const big = points.map((from) => points.map((to) => Math.abs(from - to)));
    const jobs: RouteJob[] = Array.from({ length: 7 }, (_, job) => ({
      id: `J${job}`,
      pickupIndex: 1 + job,
      deliveryIndex: 8 + job,
    }));
    const plan = planDeliveryRoute(0, jobs, big);
    expect(plan.stops).toHaveLength(14);
    expect(plan.cost).toBeLessThanOrEqual(planInGivenOrder(0, jobs, big).cost);
  });

  it("finishes at the driver's own destination when given one", () => {
    // 0 driver home, 1 pickup, 2 NGO, 3 driver's destination; all on a line.
    const line = [0, 5, 15, 20];
    const minutes = line.map((from) => line.map((to) => Math.abs(from - to)));
    const plan = planDeliveryRoute(0, [{ id: "A", pickupIndex: 1, deliveryIndex: 2 }], minutes, {
      end: 3,
    });
    // On the way: no detour beyond the direct 20 minutes.
    expect(plan.drivingMinutes).toBe(20);
    // Arrives after two 5-minute stops.
    expect(plan.endArrivalMinutes).toBe(30);
  });

  it("orders stops so the trip still ends at the destination cheaply", () => {
    // Destination sits between the pickups and the far NGO would be a dead end.
    const line = [0, 10, 40, 20];
    const minutes = line.map((from) => line.map((to) => Math.abs(from - to)));
    const withEnd = planDeliveryRoute(0, [{ id: "A", pickupIndex: 1, deliveryIndex: 2 }], minutes, {
      end: 3,
    });
    expect(withEnd.drivingMinutes).toBe(40 + 20);
  });
});
