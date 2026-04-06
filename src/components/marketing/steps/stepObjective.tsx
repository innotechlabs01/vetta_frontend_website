// src/components/marketing/steps/StepObjective.tsx
"use client";
import React from "react";
import type { WizardState } from "@/types";

type GoalT = WizardState["goal"];

export interface Item {
  id: "blank" | "recover_inactive" | "promote_repurchase" | "launch_promo" | "increase_visits" | "abandoned_cart";
  label: string;
  description: string;
  goal: GoalT; // enum real que guardas en wz.goal
}

interface StepObjectiveProps {
  items: Item[];
  selectedId: Item["id"] | null;           // <-- selección visual por id único
  handleSelect: (item: Item) => void;
}

export const StepObjective: React.FC<StepObjectiveProps> = ({
  items,
  selectedId,
  handleSelect,
}) => {
  return (
    <div className="mx-auto w-[90%] md:w-[70%] space-y-3">
      {items.map((item) => {
        const active = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item)}
            className={`w-full text-left cursor-pointer px-3.5 py-4 bg-white rounded-[12px] border flex gap-4 transition-all 
              ${active ? "border-[#1265F7] bg-blue-50" : "border-neutral-200 hover:border-gray-400"}`}
          >
            <div className="pt-0.5">
              <span
                className={`block w-5 h-5 bg-white rounded-full border-4 ${
                  active ? "border-[#1265F7]" : "border-stone-300"
                }`}
              />
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <div className="text-black text-base font-semibold">{item.label}</div>
              <div className="text-stone-500 text-sm">{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
