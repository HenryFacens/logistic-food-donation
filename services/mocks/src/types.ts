export type MockKind = "openai" | "maps" | "acs";

export type ClassificationSource = "camera" | "upload" | "manual";

export interface Classification {
  category: "produce" | "bakery" | "dairy" | "prepared" | "pantry" | "other";
  description: string;
  confidence: number;
  perishabilityMinutes: number;
  source: ClassificationSource;
  simulated: true;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface OutboxMessage {
  id: string;
  channel: "whatsapp" | "sms";
  to: string;
  body: string;
  status: "sent";
  provider: "acs-mock";
  simulated: true;
  label: "SIMULADO";
  createdAt: string;
}
