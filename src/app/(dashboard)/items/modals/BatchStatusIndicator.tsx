'use client';

import {
  BATCH_STATUS_SEGMENTS,
  getBatchStatus,
  getBatchStatusMetadata,
} from "../utils/batchStatus";

export function BatchStatusIndicator({
  expirationDate,
}: {
  expirationDate: string | null;
}) {
  const status = getBatchStatus(expirationDate);
  const metadata = getBatchStatusMetadata(status);

  return (
    <div
      className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground"
      title={metadata.shortLabel}
    >
      <div title={metadata.shortLabel} className="flex h-auto  flex-col overflow-hidden rounded-md border">
        {BATCH_STATUS_SEGMENTS.map((segment) => (
          <div
            key={segment.key}
            className={`h-3 min-h-3 w-3 rounded-full flex-1 transition-colors ${
              status === segment.key
                ? segment.className
                : segment.disabledClassName
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default BatchStatusIndicator;
