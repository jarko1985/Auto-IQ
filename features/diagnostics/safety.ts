import type { Severity } from "@prisma/client";

export interface SafetyEvaluation {
  severity: Severity;
  safeToDrive: boolean | null;
  emergencyAction?: string;
  /** Hand-authored Arabic translation of emergencyAction — never AI-generated
   * (rule #10: safety text is deterministic and binding, so it can't be left
   * to a live translation call any more than the English original can be
   * left to AI to write). Falls back to the English string when absent. */
  emergencyActionAr?: string;
}

// Deterministic safety rules — always run before AI, results are binding.
const SAFETY_RULES: Record<string, SafetyEvaluation> = {
  // ── Stop-driving immediates ───────────────────────────────────────────────
  BRAKE_FAILURE: {
    severity: "CRITICAL",
    safeToDrive: false,
    emergencyAction:
      "Stop the vehicle immediately using the handbrake if needed. Do not drive. Call for roadside assistance.",
    emergencyActionAr:
      "أوقف المركبة فورًا مستخدمًا فرامل اليد إذا لزم الأمر. لا تقد المركبة. اتصل بخدمة المساعدة على الطريق.",
  },
  BRAKE_SOFT_PEDAL: {
    severity: "CRITICAL",
    safeToDrive: false,
    emergencyAction:
      "Brake fluid or hydraulic failure suspected. Stop driving immediately and call for assistance.",
    emergencyActionAr:
      "يُشتبه في عطل بزيت الفرامل أو النظام الهيدروليكي. توقف عن القيادة فورًا واتصل لطلب المساعدة.",
  },
  ENGINE_OIL_PRESSURE: {
    severity: "CRITICAL",
    safeToDrive: false,
    emergencyAction:
      "Switch off the engine immediately. Driving without oil pressure will destroy the engine within minutes.",
    emergencyActionAr:
      "أطفئ المحرك فورًا. القيادة بدون ضغط زيت كافٍ ستؤدي إلى تلف المحرك خلال دقائق.",
  },
  STEERING_FAILURE: {
    severity: "CRITICAL",
    safeToDrive: false,
    emergencyAction:
      "Pull over to a safe location immediately. Do not attempt to drive the vehicle.",
    emergencyActionAr: "توقف في مكان آمن فورًا. لا تحاول قيادة المركبة.",
  },
  ENGINE_OVERHEATING: {
    severity: "CRITICAL",
    safeToDrive: false,
    emergencyAction:
      "Pull over and switch off the engine. Do not open the coolant cap. Allow 30 minutes to cool before inspection.",
    emergencyActionAr:
      "توقف وأطفئ المحرك. لا تفتح غطاء خزان سائل التبريد. انتظر 30 دقيقة حتى يبرد قبل الفحص.",
  },

  // ── Get checked urgently ──────────────────────────────────────────────────
  AIRBAG_WARNING: {
    severity: "HIGH",
    safeToDrive: null,
    emergencyAction:
      "Airbag system fault — airbags may not deploy in a collision. Visit a garage today.",
    emergencyActionAr:
      "عطل في نظام الوسائد الهوائية — قد لا تنتشر الوسائد الهوائية عند وقوع حادث. قم بزيارة المرآب اليوم.",
  },
  BRAKE_WARNING_LIGHT: {
    severity: "HIGH",
    safeToDrive: null,
    emergencyAction:
      "Do not ignore brake warning lights. Have the brake system inspected before your next long drive.",
    emergencyActionAr:
      "لا تتجاهل تحذير لمبة الفرامل. افحص نظام الفرامل قبل رحلتك الطويلة القادمة.",
  },
  TRANSMISSION_SLIPPING: {
    severity: "HIGH",
    safeToDrive: null,
    emergencyAction: "Avoid motorway driving. Have the transmission inspected as soon as possible.",
    emergencyActionAr: "تجنّب القيادة على الطرق السريعة. افحص ناقل الحركة في أقرب وقت ممكن.",
  },
};

export function evaluateSafety(symptomCode: string): SafetyEvaluation | null {
  return SAFETY_RULES[symptomCode] ?? null;
}

export function isSafetyEscalated(symptomCode: string): boolean {
  const rule = SAFETY_RULES[symptomCode];
  return rule?.severity === "CRITICAL" && rule.safeToDrive === false;
}
