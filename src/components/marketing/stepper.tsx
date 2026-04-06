export function Stepper({
    steps,
    current,
    onSelect,
}: {
    steps: { label: string; icon: React.ReactNode }[];
    current: number;
    onSelect?: (idx: number) => void;
}) {
    const SEGMENT_BELOW_PX = 56;
    const totalRailHeight = steps.length > 1 ? (steps.length - 1) * (48 + 32) + 24 : 0;

    return (
        <ol
            className="relative grid gap-y-8 gap-x-2"
            style={{ gridTemplateColumns: "48px 1fr" }}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 grid"
                style={{ gridTemplateColumns: "48px 1fr" }}
            >
                <span
                    className="w-[3px] bg-gray-300 rounded"
                    style={{
                        height: `${totalRailHeight}px`,
                        marginTop: "24px",
                        marginLeft: "22.5px",
                    }}
                />
            </div>

            {steps.map((s, idx) => {
                const active = idx === current;
                const done = idx < current;

                return (
                    <li key={idx} className="contents">
                        <div className="relative flex items-start justify-center">
                            <button
                                type="button"
                                onClick={() => onSelect?.(idx)}
                                aria-current={active ? "step" : undefined}
                                title={s.label}
                                className={[
                                    "flex h-12 w-12 items-center justify-center rounded-full transition border-2",
                                    active && "bg-[#416FFA] text-white border-[#416FFA]",
                                    !active && !done && "text-[#666666] border-gray-300 bg-white",
                                    done && !active && "text-white bg-[#416FFA] border-[#416FFA]",
                                ].join(" ")}
                            >
                                {s.icon}
                            </button>

                            {done && idx < steps.length - 1 && (
                                <span
                                    className="pointer-events-none absolute w-[3px] bg-[#416FFA]"
                                    style={{
                                        top: "48px",
                                        height: `${SEGMENT_BELOW_PX}px`,
                                        left: "50%",
                                        transform: "translateX(-50%)"
                                    }}
                                />
                            )}

                            {active && idx < steps.length - 1 && (
                                <span
                                    className="pointer-events-none absolute top-12 h-3 w-[3px] bg-[#416FFA] rounded-b-full"
                                    style={{
                                        left: "50%",
                                        transform: "translateX(-50%)"
                                    }}
                                />
                            )}
                        </div>

                        <div
                            className={[
                                "self-center text-sm font-medium",
                                active ? "text-[#3B82F6]" : "text-[#111827]",
                            ].join(" ")}
                        >
                            {s.label}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}