import type { Actor } from "./auth.js";

export function donationVisibility(
  actor: Actor,
  donationAlias = "donation",
): { sql: string; params: unknown[] } {
  switch (actor.role) {
    case "seller":
      return { sql: `${donationAlias}.seller_id = $1`, params: [actor.profileId] };
    case "ngo":
      return {
        sql: `EXISTS (
          SELECT 1 FROM offers AS visible_offer
          WHERE visible_offer.donation_id = ${donationAlias}.id
            AND visible_offer.ngo_id = $1
        )`,
        params: [actor.profileId],
      };
    case "driver":
      return {
        sql: `EXISTS (
          SELECT 1 FROM pickups AS visible_pickup
          WHERE visible_pickup.donation_id = ${donationAlias}.id
            AND visible_pickup.driver_id = $1
        )`,
        params: [actor.profileId],
      };
    case "partner":
      return {
        sql: `EXISTS (
          SELECT 1 FROM partner_sponsorships AS visible_sponsorship
          WHERE visible_sponsorship.donation_id = ${donationAlias}.id
            AND visible_sponsorship.partner_id = $1
        )`,
        params: [actor.profileId],
      };
    case "platform":
      return { sql: "TRUE", params: [] };
  }
}
