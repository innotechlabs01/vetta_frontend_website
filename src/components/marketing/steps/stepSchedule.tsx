// Paso 4: Programación/Entrega
"use client";

import { useState, useEffect } from "react";

interface ScheduleConfig {
  type: "scheduled" | "automated" | "now";
  scheduled_at?: string | null;
  is_automated?: boolean;
  automation_config?: {
    trigger: string;
    delay_hours?: number;
    frequency?: string;
  } | null;
}

interface StepScheduleProps {
  schedule: ScheduleConfig | null;
  onUpdate: (schedule: ScheduleConfig) => void;
}

export const StepSchedule: React.FC<StepScheduleProps> = ({ schedule, onUpdate }) => {
  // Estado local
  const [selectedType, setSelectedType] = useState<"scheduled" | "automated" | "now">(
    schedule?.type || "automated"
  );
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("10:00");
  const [automationTrigger, setAutomationTrigger] = useState<string>("birthday");
  const [automationDelay, setAutomationDelay] = useState<number>(6);
  const [automationFrequency, setAutomationFrequency] = useState<string>("once");

  // Inicializar desde props
  useEffect(() => {
    if (schedule) {
      if (schedule.scheduled_at) {
        const date = new Date(schedule.scheduled_at);
        setScheduledDate(date.toISOString().split("T")[0]);
        setScheduledTime(date.toTimeString().slice(0, 5));
      }
      if (schedule.automation_config) {
        setAutomationTrigger(schedule.automation_config.trigger || "birthday");
        setAutomationDelay(schedule.automation_config.delay_hours || 6);
        setAutomationFrequency(schedule.automation_config.frequency || "once");
      }
    }
  }, []);

  // Actualizar padre cuando cambien los datos
  useEffect(() => {
    let scheduleData: ScheduleConfig;

    if (selectedType === "scheduled") {
      const dateTime = scheduledDate && scheduledTime 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;
      
      scheduleData = {
        type: "scheduled",
        scheduled_at: dateTime,
        is_automated: false,
        automation_config: null,
      };
    } else if (selectedType === "automated") {
      scheduleData = {
        type: "automated",
        scheduled_at: null,
        is_automated: true,
        automation_config: {
          trigger: automationTrigger,
          delay_hours: automationDelay,
          frequency: automationFrequency,
        },
      };
    } else {
      // "now"
      scheduleData = {
        type: "now",
        scheduled_at: null,
        is_automated: false,
        automation_config: null,
      };
    }

    onUpdate(scheduleData);
  }, [selectedType, scheduledDate, scheduledTime, automationTrigger, automationDelay, automationFrequency]);

  const handleSelectType = (type: "scheduled" | "automated" | "now") => {
    setSelectedType(type);
  };

  return (
    <div className="mx-auto w-[90%] md:w-[70%] space-y-4">
      {/* Opción 1: Programar */}
      <div
        onClick={() => handleSelectType("scheduled")}
        className={`flex py-4 px-[14px] justify-end items-start gap-4 self-stretch rounded-[12px] border cursor-pointer transition-all ${
          selectedType === "scheduled"
            ? "border-[#1265F7] bg-blue-50"
            : "border-[#DEDEDE] hover:border-gray-400"
        }`}
      >
        <div className="flex items-start flex-[1_0_0] gap-[13px]">
          <div className="flex pt-[2px] items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="19" viewBox="0 0 20 19" fill="none">
              <circle
                cx="10"
                cy="9.5"
                r="7.5"
                fill="white"
                stroke={selectedType === "scheduled" ? "#1265F7" : "#CACACA"}
                strokeWidth="4"
              />
            </svg>
          </div>

          <div className="flex flex-col items-start gap-[6px] flex-1">
            <p className="text-black font-inter text-base font-semibold leading-normal">Programar</p>
            <p className="text-[#666] font-inter text-sm font-normal leading-normal">
              Selecciona una fecha y hora para enviarla
            </p>

            {selectedType === "scheduled" && (
              <div className="flex gap-3 mt-2 w-full">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[#666] text-xs font-medium">Fecha</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#666] text-xs font-medium">Hora</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opción 2: Automatizar */}
      <div
        onClick={() => handleSelectType("automated")}
        className={`flex py-[16px] px-[14px] justify-end items-start gap-[16px] self-stretch rounded-[12px] border cursor-pointer transition-all ${
          selectedType === "automated"
            ? "border-[#1265F7] bg-blue-50"
            : "border-[#DEDEDE] hover:border-gray-400"
        }`}
      >
        <div className="flex items-start gap-[13px] flex-[1_0_0]">
          <div className="flex pt-[2px] items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="19" viewBox="0 0 20 19" fill="none">
              <circle
                cx="10"
                cy="9.5"
                r="7.5"
                fill="white"
                stroke={selectedType === "automated" ? "#1265F7" : "#CACACA"}
                strokeWidth="4"
              />
            </svg>
          </div>

          <div className="flex flex-col items-start gap-[13px] flex-[1_0_0]">
            <div className="flex flex-col items-start">
              <p className="font-inter text-base not-italic font-semibold leading-normal">Automatizar</p>
              <p className="w-[540px] justify-start text-stone-500 text-sm font-normal font-inter">
                Selecciona un evento que al ejecutarse, envíe la campaña a los clientes.
              </p>
            </div>

            {selectedType === "automated" && (
              <>
                {/* Evento disparador */}
                <div
                  className="self-stretch px-3 py-2.5 bg-white rounded-xl border inline-flex justify-end items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-1 flex-col justify-start items-start gap-[3px]">
                    <p className="text-stone-500 text-sm font-normal">Evento disparador</p>
                    <select
                      value={automationTrigger}
                      onChange={(e) => setAutomationTrigger(e.target.value)}
                      className="self-stretch text-black text-base font-medium bg-transparent border-none outline-none"
                    >
                      <option value="birthday">Fecha de cumpleaños</option>
                      <option value="signup_anniversary">Aniversario de registro</option>
                      <option value="cart_abandoned">Carrito abandonado</option>
                    </select>
                  </div>
                  <div className="w-4 h-4 relative overflow-hidden shrink-0 flex justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="6" viewBox="0 0 11 6" fill="none">
                      <path
                        d="M10.5325 0.657518C10.4628 0.587221 10.3798 0.531425 10.2884 0.493349C10.197 0.455272 10.099 0.435669 9.99999 0.435669C9.90098 0.435669 9.80295 0.455272 9.71155 0.493349C9.62016 0.531425 9.53721 0.587221 9.46749 0.657518L6.03249 4.09252C5.96276 4.16281 5.87981 4.21861 5.78842 4.25669C5.69702 4.29476 5.59899 4.31437 5.49998 4.31437C5.40098 4.31437 5.30295 4.29476 5.21155 4.25669C5.12016 4.21861 5.03721 4.16281 4.96748 4.09252L1.53248 0.657518C1.46276 0.587221 1.37981 0.531425 1.28842 0.493349C1.19702 0.455272 1.09899 0.435669 0.999984 0.435669C0.900975 0.435669 0.802946 0.455272 0.711551 0.493349C0.620157 0.531425 0.537206 0.587221 0.467484 0.657518C0.327796 0.798039 0.24939 0.988128 0.24939 1.18627C0.24939 1.38441 0.327796 1.5745 0.467484 1.71502L3.90998 5.15752C4.33186 5.57887 4.90373 5.81554 5.49998 5.81554C6.09624 5.81554 6.66811 5.57887 7.08998 5.15752L10.5325 1.71502C10.6722 1.5745 10.7506 1.38441 10.7506 1.18627C10.7506 0.988128 10.6722 0.798039 10.5325 0.657518Z"
                        fill="black"
                      />
                    </svg>
                  </div>
                </div>

                {/* Espera */}
                <div
                  className="self-stretch px-3 py-2.5 bg-white rounded-xl border inline-flex justify-end items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-1 flex-col justify-start items-start gap-[3px]">
                    <p className="text-stone-500 text-sm font-normal">Espera</p>
                    <select
                      value={automationDelay}
                      onChange={(e) => setAutomationDelay(Number(e.target.value))}
                      className="self-stretch text-black text-base font-medium bg-transparent border-none outline-none"
                    >
                      <option value={0}>Inmediatamente</option>
                      <option value={1}>1h después del disparador</option>
                      <option value={6}>6h después del disparador</option>
                      <option value={12}>12h después del disparador</option>
                      <option value={24}>1 día después del disparador</option>
                      <option value={48}>2 días después del disparador</option>
                    </select>
                  </div>
                  <div className="w-4 h-4 relative overflow-hidden shrink-0 flex justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="6" viewBox="0 0 11 6" fill="none">
                      <path
                        d="M10.5325 0.657518C10.4628 0.587221 10.3798 0.531425 10.2884 0.493349C10.197 0.455272 10.099 0.435669 9.99999 0.435669C9.90098 0.435669 9.80295 0.455272 9.71155 0.493349C9.62016 0.531425 9.53721 0.587221 9.46749 0.657518L6.03249 4.09252C5.96276 4.16281 5.87981 4.21861 5.78842 4.25669C5.69702 4.29476 5.59899 4.31437 5.49998 4.31437C5.40098 4.31437 5.30295 4.29476 5.21155 4.25669C5.12016 4.21861 5.03721 4.16281 4.96748 4.09252L1.53248 0.657518C1.46276 0.587221 1.37981 0.531425 1.28842 0.493349C1.19702 0.455272 1.09899 0.435669 0.999984 0.435669C0.900975 0.435669 0.802946 0.455272 0.711551 0.493349C0.620157 0.531425 0.537206 0.587221 0.467484 0.657518C0.327796 0.798039 0.24939 0.988128 0.24939 1.18627C0.24939 1.38441 0.327796 1.5745 0.467484 1.71502L3.90998 5.15752C4.33186 5.57887 4.90373 5.81554 5.49998 5.81554C6.09624 5.81554 6.66811 5.57887 7.08998 5.15752L10.5325 1.71502C10.6722 1.5745 10.7506 1.38441 10.7506 1.18627C10.7506 0.988128 10.6722 0.798039 10.5325 0.657518Z"
                        fill="black"
                      />
                    </svg>
                  </div>
                </div>

                {/* Frecuencia */}
                <div
                  className="self-stretch px-3 py-2.5 bg-white rounded-xl border inline-flex justify-end items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-1 flex-col justify-start items-start gap-[3px]">
                    <p className="text-stone-500 text-sm font-normal">Frecuencia</p>
                    <select
                      value={automationFrequency}
                      onChange={(e) => setAutomationFrequency(e.target.value)}
                      className="self-stretch text-black text-base font-medium bg-transparent border-none outline-none"
                    >
                      <option value="once">1 vez, cada que se ejecute el disparador</option>
                      <option value="daily">Diario mientras esté activo</option>
                      <option value="weekly">Semanal mientras esté activo</option>
                    </select>
                  </div>
                  <div className="w-4 h-4 relative overflow-hidden shrink-0 flex justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="6" viewBox="0 0 11 6" fill="none">
                      <path
                        d="M10.5325 0.657518C10.4628 0.587221 10.3798 0.531425 10.2884 0.493349C10.197 0.455272 10.099 0.435669 9.99999 0.435669C9.90098 0.435669 9.80295 0.455272 9.71155 0.493349C9.62016 0.531425 9.53721 0.587221 9.46749 0.657518L6.03249 4.09252C5.96276 4.16281 5.87981 4.21861 5.78842 4.25669C5.69702 4.29476 5.59899 4.31437 5.49998 4.31437C5.40098 4.31437 5.30295 4.29476 5.21155 4.25669C5.12016 4.21861 5.03721 4.16281 4.96748 4.09252L1.53248 0.657518C1.46276 0.587221 1.37981 0.531425 1.28842 0.493349C1.19702 0.455272 1.09899 0.435669 0.999984 0.435669C0.900975 0.435669 0.802946 0.455272 0.711551 0.493349C0.620157 0.531425 0.537206 0.587221 0.467484 0.657518C0.327796 0.798039 0.24939 0.988128 0.24939 1.18627C0.24939 1.38441 0.327796 1.5745 0.467484 1.71502L3.90998 5.15752C4.33186 5.57887 4.90373 5.81554 5.49998 5.81554C6.09624 5.81554 6.66811 5.57887 7.08998 5.15752L10.5325 1.71502C10.6722 1.5745 10.7506 1.38441 10.7506 1.18627C10.7506 0.988128 10.6722 0.798039 10.5325 0.657518Z"
                        fill="black"
                      />
                    </svg>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Opción 3: Publicar Ahora */}
      <div
        onClick={() => handleSelectType("now")}
        className={`py-4 px-[14px] justify-end items-start gap-4 self-stretch rounded-xl border cursor-pointer transition-all ${
          selectedType === "now"
            ? "border-[#1265F7] bg-blue-50"
            : "border-[#DEDEDE] hover:border-gray-400"
        }`}
      >
        <div className="flex items-start gap-[13px] flex-1">
          <div className="flex pt-[2px] items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="19" viewBox="0 0 20 19" fill="none">
              <circle
                cx="10"
                cy="9.5"
                r="7.5"
                fill="white"
                stroke={selectedType === "now" ? "#1265F7" : "#CACACA"}
                strokeWidth="4"
              />
            </svg>
          </div>

          <div className="flex flex-col items-start gap-[6px] flex-1">
            <p className="text-base font-semibold not-italic leading-normal">Publicar Ahora</p>
            <p className="text-[#666] text-sm font-normal not-italic leading-normal">
              Se enviará a la audiencia seleccionada{" "}
              <span className="text-[#666] text-sm not-italic font-bold leading-normal">ahora mismo</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};