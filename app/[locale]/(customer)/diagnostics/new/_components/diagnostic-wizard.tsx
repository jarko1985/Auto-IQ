"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import { getVehicleImage } from "@/features/vehicles/vehicle-image";
import { useIsRtl } from "@/i18n/direction";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Zap,
  Settings,
  Thermometer,
  Wind,
  AlertCircle,
  RotateCcw,
  Car,
  Check,
  HelpCircle,
  Mic,
  MicOff,
  Camera,
  Hash,
  AlertTriangle,
  Brain,
  CheckCircle,
  Loader2,
} from "lucide-react";

// ── Voice intake (Sprint 18) ────────────────────────────────────────────────────
// Minimal structural types for the browser's native Web Speech API
// (SpeechRecognition / webkitSpeechRecognition) — not part of TypeScript's
// lib.dom.d.ts, and deliberately not the vendor's full type surface, just the
// handful of members this component actually touches. No backend provider or
// vendor key is involved; this talks to the browser's own speech engine only.

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  makeName: string;
  modelName: string;
  trimName: string | null;
  year: number;
  plateNumber: string | null;
  isDefault: boolean;
}
interface Symptom {
  id: string;
  code: string;
  label: string;
  isSafetyCritical: boolean;
}
interface Category {
  id: string;
  code: string;
  label: string;
  description: string | null;
  iconName: string | null;
  symptoms: Symptom[];
}
interface Question {
  id: string;
  code: string;
  type: string;
  text: string;
  helpText: string | null;
  options: { value: string; label: string }[] | null;
  isRequired: boolean;
}
interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}
interface ResumedSession {
  id: string;
  currentStep: number;
  categoryId: string;
  vehicleId: string;
  symptomId: string | null;
  description: string | null;
  obdCode: string | null;
  answers: { questionId: string; value: unknown }[];
  category: { id: string; code: string; label: string } | null;
}
interface Props {
  vehicles: Vehicle[];
  categories: Category[];
  resumeSession: ResumedSession | null;
}

// ── Design maps ───────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, React.ElementType> = {
  ENGINE: Settings,
  BRAKES: AlertCircle,
  ELECTRICAL: Zap,
  AC_CLIMATE: Wind,
  TYRES_WHEELS: RotateCcw,
  STEERING: RotateCcw,
  TRANSMISSION: Settings,
  EXHAUST: Wind,
  COOLING: Thermometer,
  BODY_EXTERIOR: Car,
};
const CATEGORY_COLOR: Record<string, string> = {
  ENGINE: "#0891b2",
  BRAKES: "#dc2626",
  ELECTRICAL: "#d97706",
  AC_CLIMATE: "#0891b2",
  TYRES_WHEELS: "#44474d",
  STEERING: "#7c3aed",
  TRANSMISSION: "#0891b2",
  EXHAUST: "#6b7280",
  COOLING: "#16a34a",
  BODY_EXTERIOR: "#44474d",
};

function mockHealth(mileageKm: number) {
  return Math.max(30, Math.min(98, Math.round(98 - mileageKm / 2000)));
}

function healthColor(score: number) {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: "4px", marginBottom: "1.5rem" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: "4px",
            borderRadius: "9999px",
            backgroundColor: i < current ? "#00b8d9" : "#e0e3e6",
            transition: "background-color 0.3s",
          }}
        />
      ))}
    </div>
  );
}

function StepBadge({ step, total }: { step: number; total: number }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "#fff",
        backgroundColor: "#081a2f",
        borderRadius: "9999px",
        padding: "0.3rem 0.875rem",
        letterSpacing: "0.02em",
      }}
    >
      Step {step} of {total}
    </span>
  );
}

function WizardHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#00b8d9",
            letterSpacing: "0.08em",
          }}
        >
          Diagnostic Wizard
        </span>
        <StepBadge step={step} total={total} />
      </div>
      <ProgressBar current={step} total={total} />
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#081a2f",
          margin: "0 0 0.375rem",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: 0 }}>{subtitle}</p>
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "2rem",
        paddingTop: "1.25rem",
        borderTop: "1px solid #ebeef1",
      }}
    >
      {children}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.625rem 1.375rem",
  backgroundColor: "#081a2f",
  color: "#fff",
  border: "none",
  borderRadius: "0.75rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.625rem 1.25rem",
  backgroundColor: "transparent",
  color: "#44474d",
  // Longhand, not the `border` shorthand — call sites override just
  // `borderColor` per state (voice/photo active state, cancel button), and
  // mixing a shorthand base with a longhand override causes React to warn
  // ("removing a style property... during rerender") and can drop the style
  // entirely across re-renders.
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#c4c6cd",
  borderRadius: "0.75rem",
  fontSize: "0.9375rem",
  fontWeight: 500,
  cursor: "pointer",
};
const btnCyan: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.625rem 1.375rem",
  backgroundColor: "#00b8d9",
  color: "#fff",
  border: "none",
  borderRadius: "0.75rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: "pointer",
};

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function DiagnosticWizard({ vehicles, categories, resumeSession }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const TOTAL_STEPS = 6;
  // "Back"/"Next" chevrons must still point the way the wizard's step
  // sequence reads, which flips under RTL.
  const isRtl = useIsRtl();
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;

  const [step, setStep] = useState<number>(resumeSession?.currentStep ?? 1);
  const [vehicleId, setVehicleId] = useState(resumeSession?.vehicleId ?? "");
  const [categoryId, setCategoryId] = useState(resumeSession?.categoryId ?? "");
  const [description, setDescription] = useState(resumeSession?.description ?? "");
  const [obdCode, setObdCode] = useState(resumeSession?.obdCode ?? "");
  const [contextualTrigger, setContextualTrigger] = useState("");
  const [sessionId, setSessionId] = useState(resumeSession?.id ?? (null as string | null));
  const [questions, setQuestions] = useState<Question[]>([]);
  // Adaptive question ordering (Sprint 15): `queue` holds the ids of
  // not-yet-shown questions in AI-ranked (or static-fallback) order — the
  // question on screen is always questions.find(q => q.id === queue[0]).
  // `history` holds ids already shown, in display order, so "Previous Step"
  // can step back without a second AI call.
  const [queue, setQueue] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [questionSource, setQuestionSource] = useState<"ai" | "static" | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    if (!resumeSession?.answers) return {};
    return Object.fromEntries(resumeSession.answers.map((a) => [a.questionId, a.value]));
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Visual diagnostics (Sprint 16): photo/video attachments for the current
  // session — uploaded immediately on selection (like other document uploads
  // in this app), not deferred to final submission.
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/v1/diagnostics/sessions/${sessionId}/attachments`)
      .then((r) => r.json())
      .then((d: { data?: Attachment[] }) => setAttachments(d.data ?? []))
      .catch(() => {
        // Non-fatal — the wizard still works without a hydrated attachment list.
      });
  }, [sessionId]);

  function triggerAttachmentPicker() {
    fileInputRef.current?.click();
  }

  async function handleAttachmentFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!sessionId || files.length === 0) return;

    setIsUploadingAttachment(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}/attachments`, {
          method: "POST",
          body: formData,
        });
        const body = (await res.json()) as {
          data?: Attachment;
          error?: { message: string };
        };
        if (!res.ok || !body.data) {
          toast.error(body.error?.message ?? `Failed to upload ${file.name}.`);
          continue;
        }
        setAttachments((prev) => [...prev, body.data as Attachment]);
      } catch {
        toast.error(`Failed to upload ${file.name}.`);
      }
    }
    setIsUploadingAttachment(false);
  }

  async function removeAttachment(attachmentId: string) {
    if (!sessionId) return;
    const previous = attachments;
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    const res = await fetch(
      `/api/v1/diagnostics/sessions/${sessionId}/attachments/${attachmentId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setAttachments(previous);
      toast.error("Failed to remove attachment.");
    }
  }

  // Voice intake (Sprint 18): the browser's own SpeechRecognition engine —
  // no backend provider, no vendor key. Support is inconsistent (reliable in
  // Chrome/Edge, unsupported in Firefox, partial/prefixed in Safari), so this
  // is feature-detected once on mount and the mic control is disabled with an
  // explanatory tooltip rather than throwing or silently no-op'ing when absent.
  //
  // Three explicit states rather than a boolean, so the button gives instant
  // feedback the moment it's clicked instead of waiting on the browser:
  // "starting" covers the (sometimes noticeable) gap between calling start()
  // and the engine actually opening the mic; "listening" is confirmed capture.
  const [voiceState, setVoiceState] = useState<"idle" | "starting" | "listening">("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Some browsers occasionally never fire `onend` (tab backgrounded, engine
  // wedged) — without this, "Stop Listening" would have nothing to reset the
  // UI and the button would look permanently stuck.
  const stopFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Batches rapid-fire interim results (can arrive many times a second while
  // speaking) so they don't force a full re-render of this large component on
  // every partial word — that render pressure was itself making button clicks
  // feel unresponsive during active speech.
  const pendingInterimRef = useRef<string | null>(null);

  function clearStopFallbackTimer() {
    if (stopFallbackTimerRef.current) {
      clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = null;
    }
  }

  function flushInterimTranscript() {
    if (pendingInterimRef.current !== null) {
      setInterimTranscript(pendingInterimRef.current);
      pendingInterimRef.current = null;
    }
  }

  function scheduleInterimUpdate(text: string) {
    const wasPending = pendingInterimRef.current !== null;
    pendingInterimRef.current = text;
    if (!wasPending) {
      setTimeout(flushInterimTranscript, 120);
    }
  }

  useEffect(() => {
    const w = window as unknown as SpeechRecognitionWindow;
    setIsVoiceSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => {
      clearStopFallbackTimer();
      try {
        recognitionRef.current?.stop();
      } catch {
        // Best-effort cleanup on unmount only.
      }
    };
  }, []);

  function startVoiceInput() {
    const w = window as unknown as SpeechRecognitionWindow;
    const RecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    // Instant feedback that the click landed, even before the browser has
    // actually opened the microphone.
    setVoiceState("starting");

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang === "ar" ? "ar-AE" : "en-US";

    recognition.onstart = () => {
      setVoiceState("listening");
    };

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      if (finalChunk.trim()) {
        setDescription((prev) => {
          const trimmedPrev = prev.trimEnd();
          return trimmedPrev ? `${trimmedPrev} ${finalChunk.trim()}` : finalChunk.trim();
        });
      }
      scheduleInterimUpdate(interim);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error("Voice input couldn't be captured — please try again or type instead.");
      }
      // State cleanup happens in onend, which the spec guarantees fires after
      // onerror — avoids resetting state twice from two different callbacks.
    };

    recognition.onend = () => {
      clearStopFallbackTimer();
      recognitionRef.current = null;
      pendingInterimRef.current = null;
      setVoiceState("idle");
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws if a previous session is still winding down (e.g. the
      // user clicked Voice Input again right after Stop) — surface it instead
      // of leaving the button looking dead with no explanation.
      recognitionRef.current = null;
      setVoiceState("idle");
      toast.error("Voice input couldn't start — please try again in a moment.");
    }
  }

  function stopVoiceInput() {
    // Reset the UI immediately rather than waiting on the recognition
    // object's own onend event — that event is what "sometimes unresponsive"
    // turned out to be: the browser doesn't always fire it promptly (or at
    // all), so the button must not depend on it to feel responsive.
    setVoiceState("idle");
    setInterimTranscript("");
    pendingInterimRef.current = null;

    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch {
      // Already stopped/stopping — nothing to do.
    }

    clearStopFallbackTimer();
    stopFallbackTimerRef.current = setTimeout(() => {
      // onend never arrived — force-release the mic so a future start() call
      // doesn't collide with this zombie session.
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    }, 4000);
  }

  function toggleVoiceInput() {
    if (voiceState === "idle") {
      startVoiceInput();
    } else {
      stopVoiceInput();
    }
  }

  // Generates (or, on resume, fetches the already-generated) Step 4 question
  // set for this session in a single batch call — no per-question AI
  // round-trip. Splits the result into queue (not yet answered) / history
  // (already answered, e.g. on resume) so the existing adaptive-queue UI
  // needs no other changes.
  async function loadGeneratedQuestions(currentAnswers: Record<string, unknown>) {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) throw new Error("question generation failed");
      const body = (await res.json()) as {
        data: { questions: Question[]; source: "ai" | "static" };
      };
      const qs = body.data.questions ?? [];
      const answeredIds = new Set(Object.keys(currentAnswers));
      setQuestions(qs);
      setHistory(qs.filter((q) => answeredIds.has(q.id)).map((q) => q.id));
      setQueue(qs.filter((q) => !answeredIds.has(q.id)).map((q) => q.id));
      setQuestionSource(body.data.source);
    } catch {
      toast.error("Failed to load questions.");
    }
  }

  // Only fires when step 4 is reached with no questions loaded yet — the
  // normal path (goNext's Step 3→4 transition below) already populates
  // `questions` before advancing the step, so this only matters on resume
  // (page reload mid-wizard at step 4).
  useEffect(() => {
    if (step !== 4 || questions.length > 0) return;
    void loadGeneratedQuestions(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sessionId]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // ── Step transitions ────────────────────────────────────────────────────────

  async function goNext() {
    try {
      // Step 1→2: validate vehicle
      if (step === 1) {
        if (!vehicleId) {
          toast.error("Please select a vehicle.");
          return;
        }
        setStep(2);
        return;
      }

      // Step 2→3: validate category, create session
      if (step === 2) {
        if (!categoryId) {
          toast.error("Please select a symptom category.");
          return;
        }
        setIsLoading(true);
        if (!sessionId) {
          const res = await fetch("/api/v1/diagnostics/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicleId, categoryId }),
          });
          const data = (await res.json()) as { data?: { id: string } };
          if (!res.ok) throw new Error("Failed to create session");
          setSessionId(data.data?.id ?? null);
          toast.success("Diagnostic session started.");
        }
        setStep(3);
        setIsLoading(false);
        return;
      }

      // Step 3→4: save description, then generate the full question set in
      // one batch AI call before showing the questionnaire.
      if (step === 3) {
        if (!description.trim()) {
          toast.error("Please describe the issue.");
          return;
        }
        setIsLoading(true);
        const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, obdCode: obdCode || undefined, currentStep: 3 }),
        });
        if (res.ok) toast.success("Description saved.");
        await loadGeneratedQuestions(answers);
        setStep(4);
        setIsLoading(false);
        return;
      }

      // Step 4 question advance — the question order was fixed by the single
      // batch generation call above, so moving to the next question is a
      // local queue shift, not another AI round-trip.
      if (step === 4) {
        const currentId = queue[0];
        if (queue.length > 1) {
          setHistory((h) => (currentId ? [...h, currentId] : h));
          setQueue((q) => q.slice(1));
          return;
        }
        if (currentId) setHistory((h) => [...h, currentId]);
        // All questions answered — submit
        setIsLoading(true);
        const answerPayload = Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        }));
        let answersRes: Response | null = null;
        if (answerPayload.length > 0) {
          answersRes = await fetch(`/api/v1/diagnostics/sessions/${sessionId}/answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: answerPayload }),
          });
        }
        const statusRes = await fetch(`/api/v1/diagnostics/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "AWAITING_AI", currentStep: 5 }),
        });
        if ((!answersRes || answersRes.ok) && statusRes.ok) {
          toast.success("Diagnostic submitted for analysis.");
        }
        setStep(5);
        setIsAnalyzing(true);
        // Best-effort: if this fails (network blip, provider outage), the session
        // detail page still shows a "Run Analysis" retry trigger for AWAITING_AI
        // sessions, so it's safe to navigate there regardless.
        try {
          await fetch(`/api/v1/diagnostics/sessions/${sessionId}/analyze`, { method: "POST" });
        } catch {
          // handled by the detail page's retry trigger
        }
        router.push(`/diagnostics/${sessionId}` as never);
        return;
      }
    } catch {
      setIsLoading(false);
      toast.error("Something went wrong. Please try again.");
    }
  }

  async function saveAndExit() {
    if (!sessionId) return;
    const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: step }),
    });
    if (res.ok) toast.success("Progress saved.");
    router.push("/diagnostics" as never);
  }

  async function cancelWizard() {
    if (sessionId) {
      const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) toast.success("Diagnostic session cancelled.");
    }
    router.push("/diagnostics" as never);
  }

  function goPrev() {
    if (step === 4 && history.length > 0) {
      const previousId = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setQueue((q) => (previousId ? [previousId, ...q] : q));
      return;
    }
    if (step > 1) setStep((s) => s - 1);
  }

  // ── STEP 1: Select Vehicle ──────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#00b8d9",
              letterSpacing: "0.08em",
              marginBottom: "0.375rem",
            }}
          >
            STEP 01 / 0{TOTAL_STEPS}
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#081a2f",
              margin: "0 0 0.5rem",
              letterSpacing: "-0.025em",
            }}
          >
            Diagnostic Wizard
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: 0 }}>
            Select the vehicle you want to perform a comprehensive AI scan on.
          </p>
        </div>

        {/* Vehicle grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {vehicles.map((v) => {
            const health = mockHealth(0); // no mileage on card
            const selected = vehicleId === v.id;
            const vehicleImage = getVehicleImage(v);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleId(v.id)}
                style={{
                  textAlign: "start",
                  padding: 0,
                  border: selected ? "2px solid #00b8d9" : "1px solid #ebeef1",
                  borderRadius: "1rem",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  overflow: "hidden",
                  boxShadow: selected ? "0 0 0 4px rgba(0,184,217,0.12)" : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {/* Vehicle image */}
                <div
                  style={{
                    height: "140px",
                    background: vehicleImage
                      ? undefined
                      : "linear-gradient(135deg, #0f2744 0%, #1a3a5c 50%, #0f2744 100%)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {vehicleImage ? (
                    <Image
                      src={vehicleImage}
                      alt={`${v.makeName} ${v.modelName}`}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <Car size={56} color="rgba(255,255,255,0.15)" />
                  )}
                  {/* Status badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "0.625rem",
                      insetInlineEnd: "0.625rem",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      backgroundColor: selected ? "rgba(0,184,217,0.9)" : "rgba(22,163,74,0.9)",
                      color: "#fff",
                      borderRadius: "9999px",
                      padding: "0.25rem 0.625rem",
                    }}
                  >
                    {selected ? "Selected" : v.isDefault ? "Default" : "Good Standing"}
                  </div>
                </div>

                <div style={{ padding: "1rem" }}>
                  <p
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "#081a2f",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {v.year} {v.makeName} {v.modelName}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#74777d", margin: "0 0 0.875rem" }}>
                    {v.plateNumber ? `Plate: ${v.plateNumber}` : (v.trimName ?? "No plate")}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          color: "#74777d",
                          letterSpacing: "0.08em",
                          margin: "0 0 0.125rem",
                        }}
                      >
                        HEALTH SCORE
                      </p>
                      <p
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          color: healthColor(health),
                          margin: 0,
                        }}
                      >
                        {health}%
                      </p>
                    </div>
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        border: "1px solid #ebeef1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ForwardIcon size={14} color="#44474d" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Register new vehicle card */}
          <Link
            href="/vehicles/new"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem 1rem",
              border: "2px dashed #c4c6cd",
              borderRadius: "1rem",
              backgroundColor: "#f9fafb",
              textDecoration: "none",
              gap: "0.75rem",
              transition: "border-color 0.15s",
            }}
          >
            <div
              style={{
                width: "3rem",
                height: "3rem",
                borderRadius: "50%",
                border: "2px dashed #c4c6cd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={20} color="#74777d" />
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "#181c1e",
                  margin: "0 0 0.25rem",
                }}
              >
                Register New Vehicle
              </p>
              <p style={{ fontSize: "0.8125rem", color: "#74777d", margin: 0 }}>
                Link a new vehicle to your fleet profile
              </p>
            </div>
          </Link>
        </div>

        <BottomBar>
          <button
            type="button"
            onClick={cancelWizard}
            style={{ ...btnSecondary, borderColor: "transparent" }}
          >
            <X size={15} /> Cancel Wizard
          </button>
          <button type="button" onClick={goNext} style={btnPrimary}>
            Next Step <ForwardIcon size={15} />
          </button>
        </BottomBar>
      </div>
    );
  }

  // ── STEP 2: Select Main Symptom ─────────────────────────────────────────────

  function renderStep2() {
    return (
      <div>
        <WizardHeader
          step={2}
          total={TOTAL_STEPS}
          title="Step 2: Select Main Symptom"
          subtitle="What is the primary issue you are experiencing with your vehicle?"
        />

        {/* Symptom category grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.875rem",
            marginBottom: "1.5rem",
          }}
        >
          {categories.map((cat) => {
            const Icon = CATEGORY_ICON[cat.code] ?? Settings;
            const color = CATEGORY_COLOR[cat.code] ?? "#44474d";
            const selected = categoryId === cat.id;
            const hasCritical = cat.symptoms.some((s) => s.isSafetyCritical);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                style={{
                  textAlign: "start",
                  padding: "1.25rem",
                  border: selected ? `2px solid ${color}` : "1px solid #ebeef1",
                  borderRadius: "1rem",
                  backgroundColor: selected ? `${color}08` : "#fff",
                  cursor: "pointer",
                  position: "relative",
                  boxShadow: selected ? `0 0 0 4px ${color}18` : "none",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
              >
                {hasCritical && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0.625rem",
                      insetInlineEnd: "0.625rem",
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      color: "#fff",
                      backgroundColor: "#dc2626",
                      borderRadius: "9999px",
                      padding: "0.125rem 0.5rem",
                    }}
                  >
                    !
                  </span>
                )}
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.625rem",
                    backgroundColor: `${color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.875rem",
                  }}
                >
                  <Icon size={20} color={color} />
                </div>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "#081a2f",
                    margin: "0 0 0.375rem",
                  }}
                >
                  {cat.label}
                </p>
                <p style={{ fontSize: "0.8125rem", color: "#74777d", margin: 0, lineHeight: 1.5 }}>
                  {cat.description ?? `Issues related to ${cat.label.toLowerCase()}`}
                </p>
              </button>
            );
          })}
        </div>

        {/* AI Insight box */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "#081a2f",
            borderRadius: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <Brain size={16} color="#00b8d9" />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#00b8d9",
                  letterSpacing: "0.06em",
                }}
              >
                AI PREDICTIVE INSIGHT
              </span>
            </div>
            <p
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#fff",
                margin: "0 0 0.25rem",
              }}
            >
              Not sure where to start?
            </p>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
              Our AI can analyse your vehicle&apos;s recent telematics and error logs to pinpoint
              the most likely symptom automatically.
            </p>
          </div>
          <button
            type="button"
            style={{
              ...btnCyan,
              flexShrink: 0,
              fontSize: "0.875rem",
              padding: "0.5rem 1.125rem",
            }}
          >
            Scan Vehicle Logs
          </button>
        </div>

        <BottomBar>
          <button type="button" onClick={goPrev} style={btnSecondary}>
            <BackIcon size={15} /> Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={isLoading}
            style={{ ...btnCyan, opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? (
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
            ) : null}
            Next <ForwardIcon size={15} />
          </button>
        </BottomBar>
      </div>
    );
  }

  // ── STEP 3: Describe Issue ──────────────────────────────────────────────────

  function renderStep3() {
    return (
      <div>
        <WizardHeader
          step={3}
          total={TOTAL_STEPS}
          title="Step 3: Describe the Problem"
          subtitle="Use your own words to describe what's wrong with your vehicle."
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>
          {/* Left: form */}
          <div>
            <h2
              style={{
                fontSize: "1.0625rem",
                fontWeight: 700,
                color: "#081a2f",
                margin: "0 0 0.75rem",
              }}
            >
              Describe the Problem
            </h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. I notice a high-pitched squealing sound coming from the front right wheel whenever I apply the brakes at low speeds. It started two days ago..."
              rows={7}
              style={{
                width: "100%",
                padding: "0.875rem 1rem",
                border: "1px solid #c4c6cd",
                borderRadius: "0.875rem",
                fontSize: "0.9375rem",
                color: "#181c1e",
                backgroundColor: "#fff",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />

            {/* Action buttons */}
            <div
              style={{ display: "flex", gap: "0.625rem", marginTop: "0.875rem", flexWrap: "wrap" }}
            >
              {[
                {
                  key: "voice",
                  icon: voiceState === "starting" ? Loader2 : voiceState === "listening" ? MicOff : Mic,
                  spin: voiceState === "starting",
                  label:
                    voiceState === "starting"
                      ? "Starting…"
                      : voiceState === "listening"
                        ? "Stop Listening"
                        : "Voice Input",
                  onClick: isVoiceSupported ? toggleVoiceInput : undefined,
                  disabled: !isVoiceSupported,
                  active: voiceState !== "idle",
                  danger: voiceState !== "idle",
                  title: isVoiceSupported
                    ? undefined
                    : "Voice input isn't supported in this browser. Try Chrome, Edge, or Safari on iOS/macOS.",
                },
                {
                  key: "photo",
                  icon: Camera,
                  spin: false,
                  label: "Photo/Video",
                  onClick: triggerAttachmentPicker,
                  disabled: false,
                  active: attachments.length > 0,
                  danger: false,
                  title: undefined,
                },
                {
                  key: "obd",
                  icon: Hash,
                  spin: false,
                  label: "OBD Code",
                  onClick: undefined,
                  disabled: false,
                  active: false,
                  danger: false,
                  title: undefined,
                },
              ].map(({ key, icon: Icon, spin, label, onClick, disabled, active, danger, title }) => (
                <button
                  key={key}
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  title={title}
                  aria-pressed={active}
                  style={{
                    ...btnSecondary,
                    fontSize: "0.875rem",
                    padding: "0.5rem 0.875rem",
                    ...(disabled ? { opacity: 0.45, cursor: "not-allowed" } : {}),
                    ...(active
                      ? danger
                        ? { backgroundColor: "#fee2e2", borderColor: "#dc2626", color: "#dc2626" }
                        : { backgroundColor: "#e0f7fa", borderColor: "#00b8d9", color: "#0891b2" }
                      : {}),
                  }}
                >
                  <Icon size={14} style={spin ? { animation: "spin 1s linear infinite" } : undefined} />{" "}
                  {label}
                </button>
              ))}
            </div>

            {voiceState !== "idle" && (
              <p
                aria-live="polite"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.8125rem",
                  color: "#0891b2",
                  margin: "0.625rem 0 0",
                }}
              >
                <span
                  className={voiceState === "listening" ? "animate-pulse" : "animate-spin"}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: voiceState === "listening" ? "9999px" : "2px",
                    backgroundColor: "#dc2626",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {voiceState === "starting"
                  ? "Starting voice input…"
                  : interimTranscript
                    ? `Listening: "${interimTranscript}"`
                    : "Listening…"}
              </p>
            )}

            {!isVoiceSupported && (
              <p style={{ fontSize: "0.75rem", color: "#a1a5ab", margin: "0.625rem 0 0" }}>
                Voice input needs a browser with speech-recognition support (Chrome, Edge, or
                Safari) — type your description instead.
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              multiple
              onChange={handleAttachmentFilesSelected}
              style={{ display: "none" }}
            />

            {/* Attachment thumbnails */}
            {(attachments.length > 0 || isUploadingAttachment) && (
              <div style={{ marginTop: "1.125rem" }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    marginBottom: "0.625rem",
                  }}
                >
                  {attachments.map((attachment) => {
                    const isVideo = attachment.mimeType.startsWith("video/");
                    return (
                      <div
                        key={attachment.id}
                        style={{
                          position: "relative",
                          width: "6rem",
                          height: "6rem",
                          borderRadius: "0.5rem",
                          overflow: "hidden",
                          border: "1px solid #c4c6cd",
                          backgroundColor: "#f1f4f7",
                        }}
                      >
                        {isVideo ? (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Camera size={22} color="#74777d" />
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/v1/diagnostics/sessions/${sessionId}/attachments/${attachment.id}/file`}
                            alt={attachment.filename}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          aria-label={`Remove ${attachment.filename}`}
                          style={{
                            position: "absolute",
                            top: "0.25rem",
                            insetInlineEnd: "0.25rem",
                            width: "1.25rem",
                            height: "1.25rem",
                            borderRadius: "9999px",
                            backgroundColor: "rgba(255,255,255,0.85)",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <X size={12} color="#181c1e" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={triggerAttachmentPicker}
                    disabled={isUploadingAttachment}
                    style={{
                      width: "6rem",
                      height: "6rem",
                      borderRadius: "0.5rem",
                      border: "2px dashed #c4c6cd",
                      backgroundColor: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#74777d",
                    }}
                  >
                    {isUploadingAttachment ? (
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <Plus size={20} />
                    )}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "0.8125rem", color: "#74777d" }}>
                    {attachments.length} file{attachments.length === 1 ? "" : "s"} attached ·{" "}
                    {(attachments.reduce((sum, a) => sum + a.sizeBytes, 0) / (1024 * 1024)).toFixed(
                      1,
                    )}{" "}
                    MB
                  </span>
                  {attachments.some((a) => !a.mimeType.startsWith("video/")) && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        fontSize: "0.75rem",
                        color: "#00b8d9",
                        fontWeight: 600,
                      }}
                    >
                      <Brain size={13} /> AI will analyze these images alongside your description
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* OBD code inline input */}
            <div style={{ marginTop: "1.25rem" }}>
              <label
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#181c1e",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                OBD-II Code (optional)
              </label>
              <input
                type="text"
                value={obdCode}
                onChange={(e) => setObdCode(e.target.value.toUpperCase())}
                placeholder="e.g. P0300"
                maxLength={5}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 0.875rem",
                  border: "1px solid #c4c6cd",
                  borderRadius: "0.75rem",
                  fontSize: "0.9375rem",
                  color: "#181c1e",
                  backgroundColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Contextual trigger */}
            <div style={{ marginTop: "1.25rem" }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#74777d",
                  letterSpacing: "0.06em",
                  margin: "0 0 0.375rem",
                }}
              >
                CONTEXTUAL TRIGGER
              </p>
              <label
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "#181c1e",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                What happened immediately before the issue?
              </label>
              <input
                type="text"
                value={contextualTrigger}
                onChange={(e) => setContextualTrigger(e.target.value)}
                placeholder="e.g. I hit a small pothole on Sheikh Zayed Road"
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 0.875rem",
                  border: "1px solid #c4c6cd",
                  borderRadius: "0.75rem",
                  fontSize: "0.9375rem",
                  color: "#181c1e",
                  backgroundColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Right: AI tips panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* AI Tips */}
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#fff",
                border: "1px solid #ebeef1",
                borderRadius: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.875rem",
                }}
              >
                <Brain size={15} color="#00b8d9" />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#00b8d9",
                    letterSpacing: "0.06em",
                  }}
                >
                  AI TIPS
                </span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "#44474d", margin: "0 0 0.75rem" }}>
                Specific details help our AI narrow down the cause. Mention:
              </p>
              {[
                "The sound or behaviour (e.g. clicking, accelerating, braking, idling)",
                "The duration of the problem",
                "Any wheels burning, sweet, or musty smells",
              ].map((tip) => (
                <div key={tip} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Check size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p
                    style={{ fontSize: "0.8125rem", color: "#44474d", margin: 0, lineHeight: 1.5 }}
                  >
                    {tip}
                  </p>
                </div>
              ))}
            </div>

            {/* Diagnostic confidence */}
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#fff",
                border: "1px solid #ebeef1",
                borderRadius: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.625rem",
                }}
              >
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#44474d" }}>
                  Diagnostic Confidence
                </span>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "#0891b2" }}>
                  {description.length > 50 ? "72%" : description.length > 20 ? "48%" : "24%"}
                </span>
              </div>
              <div
                style={{
                  height: "6px",
                  backgroundColor: "#e0e3e6",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "9999px",
                    backgroundColor: "#00b8d9",
                    width:
                      description.length > 50 ? "72%" : description.length > 20 ? "48%" : "24%",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#74777d",
                  margin: "0.5rem 0 0",
                  lineHeight: 1.5,
                }}
              >
                Accuracy improves as you provide more details
              </p>
            </div>

            {/* OBD scanner promo */}
            <div
              style={{
                padding: "1rem 1.25rem",
                backgroundColor: "#081a2f",
                borderRadius: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ fontSize: "1.5rem" }}>🔌</div>
              <div>
                <span
                  style={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    color: "#00b8d9",
                    letterSpacing: "0.06em",
                  }}
                >
                  PRO FEATURE
                </span>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#fff",
                    margin: "0.125rem 0 0",
                  }}
                >
                  Connect OBD-II Scanner
                </p>
              </div>
            </div>
          </div>
        </div>

        <BottomBar>
          <button type="button" onClick={goPrev} style={btnSecondary}>
            <BackIcon size={15} /> Previous Step
          </button>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button type="button" onClick={saveAndExit} style={btnSecondary}>
              Save Draft
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={isLoading}
              style={{ ...btnPrimary, opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? <Loader2 size={15} /> : null}
              Analyse & Continue <ForwardIcon size={15} />
            </button>
          </div>
        </BottomBar>
      </div>
    );
  }

  // ── STEP 4: AI Questionnaire ────────────────────────────────────────────────

  function renderStep4() {
    const question = questions.find((q) => q.id === queue[0]);
    // The batch question-generation call already resolved before this step
    // was shown (goNext's Step 3→4 transition awaits it) — the only time
    // `questions` is still empty here is the resume useEffect's in-flight
    // fetch on a page reload mid-wizard. Show a loading state rather than
    // rendering the question UI with nothing to fill it.
    const isGenerating = questions.length === 0;

    return (
      <div>
        <WizardHeader
          step={4}
          total={TOTAL_STEPS}
          title="Step 4: AI Questionnaire"
          subtitle="Answer these targeted questions to help pinpoint the root cause."
        />

        {isGenerating ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#181c1e",
                borderRadius: "9999px",
                marginBottom: "1.5rem",
              }}
            >
              <Brain size={14} color="#00b8d9" />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#fff" }}>
                AutoIQ Engine — Analysing {selectedCategory?.label?.toLowerCase()} symptoms…
              </span>
            </div>
            <div>
              <Loader2 size={28} color="#00b8d9" style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ color: "#44474d", marginTop: "1rem" }}>
                Generating tailored questions for your symptoms…
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }}>
            {/* Left: question */}
            <div>
              {/* AutoIQ Engine badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#181c1e",
                  borderRadius: "9999px",
                  marginBottom: "1.25rem",
                }}
              >
                <Brain size={14} color="#00b8d9" />
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#fff" }}>
                  AutoIQ Engine — Analysing {selectedCategory?.label?.toLowerCase()} symptoms…
                </span>
              </div>

              {/* Question counter */}
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#00b8d9",
                  letterSpacing: "0.08em",
                  margin: "0 0 0.625rem",
                }}
              >
                QUESTION {history.length + 1} OF {history.length + queue.length}
              </p>

              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#081a2f",
                  margin: "0 0 1.5rem",
                  lineHeight: 1.4,
                }}
              >
                {question?.text}
              </h2>

              {/* Answer options */}
              {question?.type === "YES_NO" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    { value: "yes", label: "Yes, definitely", icon: <Check size={20} /> },
                    { value: "no", label: "No, not at all", icon: <X size={20} /> },
                    { value: "unsure", label: "Not Sure / Other", icon: <HelpCircle size={20} /> },
                  ].map(({ value, label, icon }) => {
                    const selected = answers[question.id] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [question.id]: value }))}
                        style={{
                          padding: "1.25rem 0.75rem",
                          border: selected ? "2px solid #00b8d9" : "1px solid #ebeef1",
                          borderRadius: "1rem",
                          backgroundColor: selected ? "rgba(0,184,217,0.06)" : "#fff",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.625rem",
                          color: selected ? "#00b8d9" : "#44474d",
                          transition: "all 0.15s",
                        }}
                      >
                        {icon}
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {question?.type === "SINGLE_SELECT" && question.options && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {question.options.map((opt) => {
                    const selected = answers[question.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt.value }))}
                        style={{
                          padding: "0.875rem 1.125rem",
                          border: selected ? "2px solid #00b8d9" : "1px solid #ebeef1",
                          borderRadius: "0.875rem",
                          backgroundColor: selected ? "rgba(0,184,217,0.06)" : "#fff",
                          cursor: "pointer",
                          textAlign: "start",
                          fontSize: "0.9375rem",
                          fontWeight: selected ? 600 : 400,
                          color: selected ? "#00b8d9" : "#181c1e",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s",
                        }}
                      >
                        {opt.label}
                        {selected && <Check size={15} color="#00b8d9" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {question?.type === "TEXT" && (
                <input
                  type="text"
                  value={(answers[question.id] as string) ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
                  placeholder={question.helpText ?? "Your answer…"}
                  style={{
                    width: "100%",
                    height: "48px",
                    padding: "0 1rem",
                    border: "1px solid #c4c6cd",
                    borderRadius: "0.875rem",
                    fontSize: "0.9375rem",
                    color: "#181c1e",
                    backgroundColor: "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: "1.5rem",
                  }}
                />
              )}


              {/* Progress footer */}
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span style={{ fontSize: "0.8125rem", color: "#74777d" }}>
                  {queue.length - 1} question{queue.length - 1 !== 1 ? "s" : ""} remaining
                  {questionSource === "ai" && " · AI-generated for your symptoms"}
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueue((q) => [...history, ...q]);
                      setHistory([]);
                    }}
                    style={{
                      fontSize: "0.8125rem",
                      color: "#00b8d9",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    View previous answers
                  </button>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Why this matters */}
              {question?.helpText && (
                <div
                  style={{ padding: "1.125rem", backgroundColor: "#f1f4f7", borderRadius: "1rem" }}
                >
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#44474d",
                      letterSpacing: "0.06em",
                      margin: "0 0 0.5rem",
                    }}
                  >
                    WHY THIS MATTERS?
                  </p>
                  <p
                    style={{ fontSize: "0.8125rem", color: "#44474d", margin: 0, lineHeight: 1.6 }}
                  >
                    {question.helpText}
                  </p>
                </div>
              )}

              {/* Current vehicle */}
              {selectedVehicle && (
                <div
                  style={{
                    padding: "1.125rem",
                    backgroundColor: "#fff",
                    border: "1px solid #ebeef1",
                    borderRadius: "1rem",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#74777d",
                      letterSpacing: "0.06em",
                      margin: "0 0 0.75rem",
                    }}
                  >
                    CURRENT VEHICLE
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "3rem",
                        height: "3rem",
                        borderRadius: "0.625rem",
                        background: getVehicleImage(selectedVehicle)
                          ? undefined
                          : "linear-gradient(135deg, #0f2744, #1a3a5c)",
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getVehicleImage(selectedVehicle) ? (
                        <Image
                          src={getVehicleImage(selectedVehicle) as string}
                          alt={`${selectedVehicle.makeName} ${selectedVehicle.modelName}`}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <Car size={18} color="rgba(255,255,255,0.6)" />
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#081a2f",
                          margin: "0 0 0.125rem",
                        }}
                      >
                        {selectedVehicle.year} {selectedVehicle.makeName}{" "}
                        {selectedVehicle.modelName}
                      </p>
                      {selectedVehicle.plateNumber && (
                        <p style={{ fontSize: "0.75rem", color: "#74777d", margin: 0 }}>
                          {selectedVehicle.plateNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick tip */}
              <div
                style={{ padding: "1.125rem", backgroundColor: "#081a2f", borderRadius: "1rem" }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#00b8d9",
                    letterSpacing: "0.06em",
                    margin: "0 0 0.5rem",
                  }}
                >
                  QUICK TIP
                </p>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "rgba(255,255,255,0.75)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Answer honestly — even "Not Sure" helps the AI narrow down the diagnosis more
                  accurately than a guess.
                </p>
              </div>
            </div>
          </div>
        )}

        <BottomBar>
          <button type="button" onClick={goPrev} style={btnSecondary}>
            <BackIcon size={15} /> Previous Step
          </button>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button type="button" onClick={saveAndExit} style={btnSecondary}>
              Save and Exit
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={isLoading}
              style={{ ...btnPrimary, opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? (
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              ) : null}
              {queue.length > 1 ? "Continue" : "Submit"}
              <ForwardIcon size={15} />
            </button>
          </div>
        </BottomBar>
      </div>
    );
  }

  // ── STEP 5: Processing / Submitted ─────────────────────────────────────────

  function renderStep5() {
    return (
      <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            marginBottom: "2.5rem",
          }}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const n = i + 1;
            const active = n === 5;
            const done = n < 5;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    backgroundColor: active ? "#00b8d9" : done ? "#081a2f" : "#e0e3e6",
                    color: active || done ? "#fff" : "#74777d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                  }}
                >
                  {done ? <Check size={13} /> : n}
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div
                    style={{
                      width: "2rem",
                      height: "2px",
                      backgroundColor: done ? "#081a2f" : "#e0e3e6",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "#081a2f",
            margin: "0 0 0.5rem",
            letterSpacing: "-0.025em",
          }}
        >
          {isAnalyzing ? "Analyzing…" : "Session Submitted"}
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "#44474d",
            margin: "0 0 2.5rem",
            maxWidth: "480px",
            display: "inline-block",
            lineHeight: 1.6,
          }}
        >
          {isAnalyzing
            ? "Reviewing your symptoms against approved automotive knowledge. Redirecting to your results…"
            : "Your diagnostic session has been saved."}
        </p>

        {/* Processing card */}
        <div
          style={{
            maxWidth: "520px",
            margin: "0 auto 2rem",
            padding: "2rem",
            backgroundColor: "#081a2f",
            borderRadius: "1.25rem",
            textAlign: "start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#00b8d9",
                  letterSpacing: "0.06em",
                  margin: "0 0 0.25rem",
                }}
              >
                SESSION SAVED
              </p>
              <p style={{ fontSize: "0.9375rem", color: "#fff", fontWeight: 600, margin: 0 }}>
                {selectedCategory?.label} — {selectedVehicle?.year} {selectedVehicle?.makeName}
              </p>
            </div>
            <CheckCircle size={32} color="#00b8d9" />
          </div>
          <div
            style={{
              height: "1px",
              backgroundColor: "rgba(255,255,255,0.1)",
              marginBottom: "1.25rem",
            }}
          />
          {[
            {
              label: "Vehicle",
              value: `${selectedVehicle?.year} ${selectedVehicle?.makeName} ${selectedVehicle?.modelName}`,
            },
            { label: "Category", value: selectedCategory?.label ?? "—" },
            {
              label: "Answers recorded",
              value: `${Object.keys(answers).length} of ${questions.length}`,
            },
            { label: "Session ID", value: sessionId?.slice(0, 8) ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem" }}
            >
              <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)" }}>{label}</span>
              <span style={{ fontSize: "0.8125rem", color: "#fff", fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center" }}>
          <Link href="/diagnostics" style={{ ...btnSecondary, textDecoration: "none" }}>
            View All Sessions
          </Link>
          <Link href="/diagnostics/new" style={{ ...btnCyan, textDecoration: "none" }}>
            <Plus size={15} /> New Diagnosis
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
    </div>
  );
}
