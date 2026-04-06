// Paso 5: Revisar y Publicar
"use client";

interface ReviewItem {
  title: string;
  description: string;
}

interface StepReviewProps {
  campaign: {
    name?: string | null;
    goal?: string | null;
    audience_filters?: {
      location?: string[];
      categories?: string[];
      zones?: string[];
      days_since_purchase?: string;
      cart_interaction_days?: string;
    } | null;
    estimated_audience?: number;
    offer_id?: string | null;
    message_template?: any;
    channels?: string[] | null;
    schedule?: {
      type: "scheduled" | "automated" | "now";
      scheduled_at?: string | null;
      automation_config?: {
        trigger: string;
        delay_hours?: number;
        frequency?: string;
      } | null;
    } | null;
  };
  estimatedAudience: number;
}

export const StepReview: React.FC<StepReviewProps> = ({ campaign, estimatedAudience }) => {
  // Generar items de resumen basados en los datos de la campaña
  const generateReviewItems = (): ReviewItem[] => {
    const items: ReviewItem[] = [];

    // 1. Objetivo
    if (campaign.goal) {
      items.push({
        title: "Objetivo de la campaña",
        description: campaign.goal,
      });
    }

    // 2. Audiencia
    const audienceDetails: string[] = [];
    if (campaign.audience_filters) {
      const { location, categories, zones, days_since_purchase, cart_interaction_days } = campaign.audience_filters;
      
      if (location && location.length > 0) {
        audienceDetails.push(`Sucursales: ${location.join(", ")}`);
      }
      if (categories && categories.length > 0) {
        audienceDetails.push(`Categorías: ${categories.join(", ")}`);
      }
      if (zones && zones.length > 0) {
        audienceDetails.push(`Zonas: ${zones.join(", ")}`);
      }
      if (days_since_purchase) {
        audienceDetails.push(`Última compra: ${days_since_purchase}`);
      }
      if (cart_interaction_days) {
        audienceDetails.push(`Carrito: ${cart_interaction_days}`);
      }
    }

    items.push({
      title: "Audiencia",
      description: `${estimatedAudience.toLocaleString()} clientes seleccionados${
        audienceDetails.length > 0 ? ". Filtros: " + audienceDetails.join("; ") : ""
      }`,
    });

    // 3. Oferta
    if (campaign.offer_id) {
      items.push({
        title: "Oferta seleccionada",
        description: `ID: ${campaign.offer_id}`,
      });
    }

    // 4. Mensaje
    if (campaign.message_template) {
      let messagePreview = "";
      if (typeof campaign.message_template === "string") {
        messagePreview = campaign.message_template.substring(0, 100) + "...";
      } else if (campaign.message_template.message) {
        messagePreview = campaign.message_template.message.substring(0, 100) + "...";
      }
      
      items.push({
        title: "Mensaje",
        description: messagePreview,
      });
    }

    // 5. Canales
    if (campaign.channels && campaign.channels.length > 0) {
      const channelNames = campaign.channels.map((ch) => {
        if (ch === "whatsapp") return "WhatsApp";
        if (ch === "sms") return "SMS";
        return ch;
      });
      
      items.push({
        title: "Canales de comunicación",
        description: channelNames.join(", "),
      });
    }

    // 6. Programación
    if (campaign.schedule) {
      let scheduleDesc = "";
      
      if (campaign.schedule.type === "scheduled" && campaign.schedule.scheduled_at) {
        const date = new Date(campaign.schedule.scheduled_at);
        scheduleDesc = `Programada para ${date.toLocaleDateString()} a las ${date.toLocaleTimeString()}`;
      } else if (campaign.schedule.type === "automated" && campaign.schedule.automation_config) {
        const { trigger, delay_hours, frequency } = campaign.schedule.automation_config;
        
        let triggerName = trigger;
        if (trigger === "birthday") triggerName = "Cumpleaños";
        if (trigger === "signup_anniversary") triggerName = "Aniversario de registro";
        if (trigger === "cart_abandoned") triggerName = "Carrito abandonado";
        
        let delayText = delay_hours === 0 ? "inmediatamente" : `${delay_hours}h después`;
        
        let frequencyText = "una vez";
        if (frequency === "daily") frequencyText = "diariamente";
        if (frequency === "weekly") frequencyText = "semanalmente";
        
        scheduleDesc = `Automatizada: disparador "${triggerName}", espera ${delayText}, frecuencia ${frequencyText}`;
      } else if (campaign.schedule.type === "now") {
        scheduleDesc = "Se publicará inmediatamente";
      }
      
      items.push({
        title: "Entrega",
        description: scheduleDesc,
      });
    }

    return items;
  };

  const reviewItems = generateReviewItems();

  return (
    <div className="mx-auto w-[90%] md:w-[70%] space-y-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Resumen de la campaña</h3>
        <p className="text-gray-600">
          Revisa que toda la información sea correcta antes de publicar
        </p>
      </div>

      {reviewItems.map((item, index) => (
        <div
          key={index}
          className="flex py-4 px-[14px] flex-col items-start gap-[6px] self-stretch rounded-xl bg-[#F6F6F6]"
        >
          <p className="text-black font-inter text-base font-semibold leading-normal">
            {item.title}
          </p>
          <p className="text-[#666] font-inter text-sm font-normal leading-normal">
            {item.description}
          </p>
        </div>
      ))}

      {reviewItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Completa los pasos anteriores para ver el resumen
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
          <strong>Nota:</strong> Una vez publicada, la campaña comenzará a ejecutarse según la configuración de entrega seleccionada.
          {campaign.schedule?.type === "now" && " Los mensajes se enviarán inmediatamente."}
        </p>
      </div>
    </div>
  );
};