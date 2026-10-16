import assert from "node:assert/strict";
import test from "node:test";

import { createPickupMessage } from "../src/handlers/pickup-notification.js";

const donation = {
  donation_description: "Pães do fim do dia",
  simulated: true,
};

test("pickup notification preserves the event state instead of the latest row state", () => {
  assert.equal(
    createPickupMessage(donation, "collected"),
    "SIMULADO - Coleta confirmada: Pães do fim do dia.",
  );
  assert.equal(
    createPickupMessage(donation, "delivered"),
    "SIMULADO - Entrega confirmada: Pães do fim do dia.",
  );
});
