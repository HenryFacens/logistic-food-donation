import type { DonationStatus, DonationTransition } from "../schemas/donations.js";

export class InvalidDonationTransitionError extends Error {
  readonly from: DonationStatus;
  readonly to: DonationStatus;

  constructor(from: DonationStatus, to: DonationStatus) {
    super(`Invalid donation transition: ${from} -> ${to}`);
    this.name = "InvalidDonationTransitionError";
    this.from = from;
    this.to = to;
  }
}

export const DONATION_TRANSITIONS = {
  posted: ["classified", "expired"],
  classified: ["offered", "expired", "no_destination"],
  offered: ["accepted", "expired", "no_destination"],
  accepted: ["collected"],
  collected: ["delivered"],
  delivered: [],
  expired: [],
  no_destination: [],
} as const satisfies Record<DonationStatus, readonly DonationStatus[]>;

export const TERMINAL_DONATION_STATUSES = [
  "delivered",
  "expired",
  "no_destination",
] as const satisfies readonly DonationStatus[];

export function allowedDonationTransitions(
  status: DonationStatus,
): readonly DonationStatus[] {
  return DONATION_TRANSITIONS[status];
}

export function canTransitionDonation(
  from: DonationStatus,
  to: DonationStatus,
): boolean {
  return (DONATION_TRANSITIONS[from] as readonly DonationStatus[]).includes(to);
}

export function assertDonationTransition(
  from: DonationStatus,
  to: DonationStatus,
): void {
  if (!canTransitionDonation(from, to)) {
    throw new InvalidDonationTransitionError(from, to);
  }
}

export function isTerminalDonationStatus(status: DonationStatus): boolean {
  return (TERMINAL_DONATION_STATUSES as readonly DonationStatus[]).includes(
    status,
  );
}

export function validateTransitionCommand(
  transition: DonationTransition,
): DonationTransition {
  assertDonationTransition(
    transition.expectedStatus,
    transition.nextStatus,
  );
  return transition;
}
