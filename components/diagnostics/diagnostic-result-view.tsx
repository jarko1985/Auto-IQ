import type { CSSProperties } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Info,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { DiagnosticCause, DiagnosticResult } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RecommendedGaragesCard, type RecommendedGarage } from "./recommended-garages-card";

type ResultWithCauses = DiagnosticResult & { causes: DiagnosticCause[] };

export interface DiagnosticCitation {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string | null;
  documentType: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  OEM_MANUAL: "OEM Manual",
  SERVICE_BULLETIN: "Service Bulletin",
  REPAIR_GUIDE: "Repair Guide",
  DIAGNOSTIC_REFERENCE: "Diagnostic Reference",
  RECALL_NOTICE: "Recall Notice",
  OTHER: "Reference",
};

const SEVERITY_META = {
  LOW: { label: "Low Severity", color: "#16a34a", note: "Routine — Monitor" },
  MEDIUM: { label: "Medium Severity", color: "#d97706", note: "Inspection Recommended" },
  HIGH: { label: "High Severity", color: "#ea580c", note: "Prompt Attention Needed" },
  CRITICAL: { label: "Critical Severity", color: "#dc2626", note: "Immediate Action Required" },
} as const;

const DRIVE_STATUS_NOTE = {
  true: "No immediate mobility restrictions identified.",
  false: "Avoid driving until this issue has been inspected.",
  null: "Drive cautiously and schedule an inspection soon.",
} as const;

function formatTaxonomyLabel(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function badgeStyle(color: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color,
    backgroundColor: `${color}18`,
    borderRadius: "9999px",
    padding: "0.375rem 0.75rem",
  };
}

const cardStyle: CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #ebeef1",
  borderRadius: "1rem",
  padding: "1.25rem 1.5rem",
};

const sectionLabelStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#74777d",
  letterSpacing: "0.06em",
  margin: 0,
};

export function DiagnosticResultView({
  result,
  citations = [],
  recommendedGarages,
}: {
  result: ResultWithCauses;
  citations?: DiagnosticCitation[];
  /** Rendered as a compact card in the right column, per the Stitch
   * "AI Diagnostic Results - Refined Light Theme" reference — omitted
   * entirely (e.g. the read-only admin session view) when not provided. */
  recommendedGarages?: { garages: RecommendedGarage[]; deepLinkQuery: string };
}) {
  const severityMeta = SEVERITY_META[result.severity];
  const driveNote = DRIVE_STATUS_NOTE[String(result.safeToDrive) as "true" | "false" | "null"];
  const hasCostRange = result.costRangeMinMinor != null && result.costRangeMaxMinor != null;
  const topConfidence = result.causes[0]?.confidence;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Emergency banner — full width, only when the AI/safety rules flagged one */}
      {result.emergencyAction && (
        <div
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "#fef2f2",
            border: "1.5px solid #fca5a5",
            borderRadius: "1rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
          }}
        >
          <ShieldAlert size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "0.875rem", color: "#991b1b", margin: 0, lineHeight: 1.6 }}>
            {result.emergencyAction}
          </p>
        </div>
      )}

      {/* Two-column layout — wider analysis column left, severity + garages
          right — per the Stitch "Refined Light Theme" reference screen. */}
      <div className="grid-analysis-split" style={{ alignItems: "start" }}>
        {/* Left column — main analysis */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Plain-language explanation */}
          {result.customerExplanation && (
            <div style={{ ...cardStyle, backgroundColor: "#f1f4f7", border: "none" }}>
              <p style={{ ...sectionLabelStyle, color: "#0891b2", marginBottom: "0.625rem" }}>
                WHAT THIS MEANS FOR YOU
              </p>
              <p style={{ fontSize: "0.9375rem", color: "#181c1e", margin: 0, lineHeight: 1.65 }}>
                {result.customerExplanation}
              </p>
            </div>
          )}

          {/* Ranked causes — "AI Intelligence Engine" */}
          {result.causes.length > 0 && (
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Gauge size={15} color="#081a2f" />
                  <p style={{ ...sectionLabelStyle, color: "#081a2f" }}>AI INTELLIGENCE ENGINE</p>
                </div>
                {topConfidence != null && (
                  <span style={{ ...badgeStyle("#00b8d9"), padding: "0.25rem 0.625rem" }}>
                    Confidence {topConfidence}%
                  </span>
                )}
              </div>
              <Accordion
                type="multiple"
                defaultValue={result.causes[0] ? [result.causes[0].id] : []}
              >
                {result.causes.map((cause, index) => (
                  <AccordionItem key={cause.id} value={cause.id} style={{ borderColor: "#ebeef1" }}>
                    <AccordionTrigger className="hover:no-underline">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flex: 1,
                          gap: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#00b8d9" }}>
                            {cause.confidence}%
                          </span>
                          <span
                            style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f" }}
                          >
                            {cause.label}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {cause.evidence.length > 0 && (
                        <div style={{ marginBottom: "0.625rem" }}>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#74777d",
                              letterSpacing: "0.04em",
                              margin: "0 0 0.375rem",
                            }}
                          >
                            SUPPORTING EVIDENCE
                          </p>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {cause.evidence.map((item, i) => (
                              <li
                                key={i}
                                style={{
                                  display: "flex",
                                  gap: "0.5rem",
                                  fontSize: "0.8125rem",
                                  color: "#44474d",
                                  marginBottom: "0.375rem",
                                }}
                              >
                                <CheckCircle2
                                  size={14}
                                  color="#16a34a"
                                  style={{ flexShrink: 0, marginTop: "1px" }}
                                />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {cause.missingEvidence.length > 0 && (
                        <div style={{ marginBottom: "0.5rem" }}>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#74777d",
                              letterSpacing: "0.04em",
                              margin: "0 0 0.375rem",
                            }}
                          >
                            NEEDED TO CONFIRM
                          </p>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {cause.missingEvidence.map((item, i) => (
                              <li
                                key={i}
                                style={{
                                  display: "flex",
                                  gap: "0.5rem",
                                  fontSize: "0.8125rem",
                                  color: "#74777d",
                                  marginBottom: "0.375rem",
                                }}
                              >
                                <Info
                                  size={14}
                                  color="#0891b2"
                                  style={{ flexShrink: 0, marginTop: "1px" }}
                                />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {cause.suggestedChecks.length > 0 && (
                        <div style={{ marginTop: "0.75rem" }}>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#74777d",
                              letterSpacing: "0.04em",
                              margin: "0 0 0.375rem",
                            }}
                          >
                            SUGGESTED CHECKS
                          </p>
                          <p
                            style={{
                              fontSize: "0.8125rem",
                              color: "#44474d",
                              margin: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            {cause.suggestedChecks.join(" · ")}
                          </p>
                        </div>
                      )}

                      {(cause.requiredServiceCodes.length > 0 ||
                        cause.likelyPartCategoryCodes.length > 0) && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.375rem",
                            marginTop: "0.75rem",
                          }}
                        >
                          {cause.requiredServiceCodes.map((code) => (
                            <span
                              key={code}
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                color: "#0891b2",
                                backgroundColor: "#e0f7fa",
                                borderRadius: "0.375rem",
                                padding: "0.1875rem 0.5rem",
                              }}
                            >
                              {formatTaxonomyLabel(code)}
                            </span>
                          ))}
                          {cause.likelyPartCategoryCodes.map((code) => (
                            <span
                              key={code}
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                color: "#44474d",
                                backgroundColor: "#f1f4f7",
                                borderRadius: "0.375rem",
                                padding: "0.1875rem 0.5rem",
                              }}
                            >
                              {formatTaxonomyLabel(code)}
                            </span>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Knowledge-base citations */}
          {citations.length > 0 && (
            <div id="diagnostic-sources" style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.875rem",
                }}
              >
                <BookOpen size={15} color="#0891b2" />
                <p style={{ ...sectionLabelStyle, color: "#0891b2" }}>
                  SOURCED FROM KNOWLEDGE BASE
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {citations.map((doc) => {
                  const content = (
                    <>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#181c1e",
                            margin: "0 0 0.125rem",
                          }}
                        >
                          {doc.title}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "#74777d", margin: 0 }}>
                          {doc.sourceName}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "#0891b2",
                            backgroundColor: "#e0f7fa",
                            borderRadius: "0.375rem",
                            padding: "0.1875rem 0.5rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                        </span>
                        {doc.sourceUrl && <ExternalLink size={14} color="#74777d" />}
                      </div>
                    </>
                  );
                  const rowStyle: CSSProperties = {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.75rem 0.875rem",
                    backgroundColor: "#f7fafd",
                    borderRadius: "0.625rem",
                    textDecoration: "none",
                  };
                  return doc.sourceUrl ? (
                    <a
                      key={doc.id}
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={rowStyle}
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={doc.id} style={rowStyle}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column — severity + recommended garages */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          <div
            style={{
              ...cardStyle,
              borderInlineStart: `3px solid ${severityMeta.color}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <AlertTriangle size={15} color={severityMeta.color} />
              <p style={{ ...sectionLabelStyle, color: severityMeta.color }}>
                SEVERITY: {result.severity}
              </p>
            </div>
            <p
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#081a2f",
                margin: "0 0 0.625rem",
              }}
            >
              {severityMeta.note}
            </p>

            <p
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                color: "#74777d",
                letterSpacing: "0.04em",
                margin: "0 0 0.25rem",
              }}
            >
              OPERATIONAL RESTRICTION
            </p>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#5b6472",
                margin: "0 0 0.75rem",
                lineHeight: 1.5,
              }}
            >
              {result.emergencyAction ?? driveNote}
            </p>

            {citations.length > 0 && (
              <a
                href="#diagnostic-sources"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.75rem",
                  color: "#0891b2",
                  textDecoration: "none",
                }}
              >
                <BookOpen size={11} /> Backed by {citations.length} verified source
                {citations.length === 1 ? "" : "s"}
              </a>
            )}
          </div>

          {recommendedGarages && (
            <RecommendedGaragesCard
              garages={recommendedGarages.garages}
              deepLinkQuery={recommendedGarages.deepLinkQuery}
            />
          )}
        </div>
      </div>

      {/* Estimated repair cost — full page width */}
      <div style={{ ...cardStyle, backgroundColor: "#081a2f", border: "none" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}
        >
          <Wallet size={15} color="#00b8d9" />
          <p style={{ ...sectionLabelStyle, color: "rgba(255,255,255,0.6)" }}>
            ESTIMATED REPAIR COST
          </p>
        </div>
        {hasCostRange ? (
          <>
            <p
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#fff",
                margin: "0 0 0.25rem",
                letterSpacing: "-0.01em",
              }}
            >
              {formatCurrency(result.costRangeMinMinor!, result.costRangeCurrency ?? "AED")} –{" "}
              {formatCurrency(result.costRangeMaxMinor!, result.costRangeCurrency ?? "AED")}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
              Rough estimate based on typical UAE market rates — not a quote.
            </p>
          </>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
            Not enough information to estimate a cost range yet.
          </p>
        )}
      </div>

      {/* AI disclaimer — full width footer bar */}
      {result.limitations.length > 0 && (
        <div style={{ padding: "1rem 1.25rem", backgroundColor: "#081a2f", borderRadius: "1rem" }}>
          <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
            <Sparkles size={16} color="#00b8d9" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "#fff",
                  margin: "0 0 0.375rem",
                }}
              >
                AI-Generated Insight
              </p>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                This analysis is a probabilistic recommendation, not a certified inspection.{" "}
                {result.limitations.join(" ")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
