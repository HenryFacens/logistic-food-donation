import { app } from "@azure/functions";
import {
  getQueueDashboard,
  listDeadLetters,
  replayDeadLetters,
} from "./routes/admin.js";
import { withErrorHandling, type ApiHandler } from "./http.js";
import {
  listCoupons,
  redeemCoupon,
} from "./routes/coupons.js";
import {
  createDonation,
  getDonation,
  listDonationEvents,
  listDonations,
} from "./routes/donations.js";
import {
  getPartnerDashboard,
  getSellerForecast,
  getSellerImpact,
  listPartnerRedemptions,
} from "./routes/dashboards.js";
import {
  getDriverDashboard,
  getNgoDashboard,
  getPlatformDashboard,
  getSellerDashboard,
} from "./routes/metricsDashboards.js";
import {
  createDriverRating,
  listDriverRatingOpportunities,
} from "./routes/driverRatings.js";
import { streamEvents } from "./routes/events.js";
import { listNgos } from "./routes/ngos.js";
import {
  acceptOffer,
  declineOffer,
  listOffers,
} from "./routes/offers.js";
import {
  assignPickup,
  confirmCollection,
  confirmDelivery,
  listPickups,
} from "./routes/pickups.js";
import { createDeliveryReceipt } from "./routes/receipts.js";
import { resetDemo } from "./routes/reset.js";
import {
  getCurrentUser,
  listDemoUsers,
} from "./routes/session.js";
import { health } from "./routes/system.js";
import { classifyDonation } from "./routes/vision.js";

app.setup({ enableHttpStream: true });

function route(
  name: string,
  method: "GET" | "POST",
  path: string,
  handler: ApiHandler,
): void {
  app.http(name, {
    methods: [method],
    authLevel: "anonymous",
    route: path,
    handler: withErrorHandling(handler),
  });
}

route("getHealth", "GET", "health", health);
route("listDemoUsers", "GET", "demo/users", listDemoUsers);
route("getCurrentDemoUser", "GET", "me", getCurrentUser);
route("classifyDonation", "POST", "vision/classify", classifyDonation);
route("listDonations", "GET", "donations", listDonations);
route("createDonation", "POST", "donations", createDonation);
route("getDonation", "GET", "donations/{donationId}", getDonation);
route(
  "listDonationEvents",
  "GET",
  "donations/{donationId}/events",
  listDonationEvents,
);
route("listOffers", "GET", "offers", listOffers);
route("acceptOffer", "POST", "offers/{offerId}/accept", acceptOffer);
route("declineOffer", "POST", "offers/{offerId}/decline", declineOffer);
route("rejectOffer", "POST", "offers/{offerId}/reject", declineOffer);
route("listPickups", "GET", "pickups", listPickups);
route("assignPickup", "POST", "pickups/{pickupId}/assign", assignPickup);
route(
  "confirmCollection",
  "POST",
  "pickups/{pickupId}/collect",
  confirmCollection,
);
route(
  "confirmDelivery",
  "POST",
  "pickups/{pickupId}/deliver",
  confirmDelivery,
);
route(
  "createDeliveryReceipt",
  "POST",
  "pickups/{pickupId}/receipt",
  createDeliveryReceipt,
);
route(
  "createDriverRating",
  "POST",
  "pickups/{pickupId}/driver-rating",
  createDriverRating,
);
route(
  "listDriverRatingOpportunities",
  "GET",
  "driver-ratings/opportunities",
  listDriverRatingOpportunities,
);
route("listCoupons", "GET", "coupons", listCoupons);
route("redeemCoupon", "POST", "coupons/{couponId}/redeem", redeemCoupon);
route("streamEvents", "GET", "events", streamEvents);
route("stream", "GET", "stream", streamEvents);
route("getSellerImpact", "GET", "impact", getSellerImpact);
route("getImpactMetrics", "GET", "metrics/impact", getSellerImpact);
route("getSellerForecast", "GET", "impact/forecast", getSellerForecast);
route("getSellerDashboard", "GET", "seller/dashboard", getSellerDashboard);
route("getDriverDashboard", "GET", "driver/dashboard", getDriverDashboard);
route("getNgoDashboard", "GET", "ngo/dashboard", getNgoDashboard);
route(
  "getPlatformDashboard",
  "GET",
  "platform/dashboard",
  getPlatformDashboard,
);
route("getPartnerDashboard", "GET", "partner/dashboard", getPartnerDashboard);
route(
  "listPartnerRedemptions",
  "GET",
  "partner/redemptions",
  listPartnerRedemptions,
);
route(
  "listPartnerRedemptionsById",
  "GET",
  "partners/{partnerId}/redemptions",
  listPartnerRedemptions,
);
// Azure Functions reserves the internal /admin prefix. The gateway rewrites
// the public /api/admin contract to these /api/ops routes.
route("getQueueDashboard", "GET", "ops/queues", getQueueDashboard);
route("listDeadLetters", "GET", "ops/dead-letters", listDeadLetters);
route(
  "replayDeadLetters",
  "POST",
  "ops/dead-letters/replay",
  replayDeadLetters,
);

// Product extensions requested by the API implementation brief.
route("listNgos", "GET", "ngos", listNgos);
route("resetDemo", "POST", "dev/reset", resetDemo);
