const STEPS = ["Vehicle", "Service", "Schedule", "Review"];

export function StepProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "#00b8d9",
          letterSpacing: "0.08em",
          marginBottom: "0.75rem",
        }}
      >
        STEP {step} OF {STEPS.length}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: active ? "#081a2f" : done ? "#00b8d9" : "#c4c6cd",
                  fontWeight: active ? 700 : 500,
                  fontSize: "0.8125rem",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    backgroundColor: active || done ? "#081a2f" : "#f0f2f5",
                    color: active || done ? "#fff" : "#8a92a6",
                    flexShrink: 0,
                  }}
                >
                  {n}
                </span>
                {label}
              </div>
              {n < STEPS.length && (
                <div style={{ flex: 1, height: "1px", backgroundColor: "#ebeef1" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
