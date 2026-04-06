import React, { forwardRef } from "react";
import clsx from "clsx";

interface HorizontalCardListProps {
  className?: string;
  children: React.ReactNode;
}

export const HorizontalCardList = forwardRef<HTMLDivElement, HorizontalCardListProps>(
  ({ className, children }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "fixed md:absolute items-center left-0 right-auto md:inset-0 w-[calc(100svw-140px)] md:w-[calc(100%-490px)] z-[50] bg-white/95 backdrop-blur py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2 overflow-x-auto flex items-center px-3",
        className
      )}
      style={{ bottom: 0, top: "auto" }}
    >
      {children}
    </div>
  )
);

HorizontalCardList.displayName = "HorizontalCardList";

// Ejemplo de uso:
// <HorizontalCardList>
//   <div className="min-w-[200px] h-32 bg-blue-200 rounded shadow">Tarjeta 1</div>
//   <div className="min-w-[200px] h-32 bg-green-200 rounded shadow">Tarjeta 2</div>
// </HorizontalCardList>
