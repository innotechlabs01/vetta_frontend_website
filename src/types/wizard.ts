// ---------------- Types ----------------
type Channel = "sms" | "email" | "whatsapp";
type Goal = "awareness" | "engagement" | "conversion" | "retention" | "birthday";


export type WizardState = {
  id?: string; // Para edición
  name: string;
  goal: Goal;
  audience_filters: {
    location?: string[];
    categories?: string[];
    zones?: string[];
    lastPurchase?: string;
    cart_interaction_days?: string;
  };
  estimated_audience: number;
  offer_id: string | null;
  message_template: string;
  channels: Channel[];
  schedule: {
    type: "now" | "scheduled" | "automated";
    scheduled_at?: string;
    is_automated?: boolean;
    automation_config?: {
      trigger: "birthday";
      days_before: number;
      frequency: "once" | "recurring";
    };
  };
};

export const defaultWizard: WizardState = {
  name: "Nueva campaña",
  goal: "conversion",
  audience_filters: {},
  estimated_audience: 0,
  offer_id: null,
  message_template: "¡Hola {{first_name}}! Regresa hoy y ahorra 10% con {{coupon}}.",
  channels: ["whatsapp"],
  schedule: { type: "now" },
};
