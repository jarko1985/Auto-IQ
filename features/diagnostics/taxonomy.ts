import { z } from "zod";

// Placeholder part-category taxonomy for Sprint 6. There is no real
// PartCategory-linked FK for AI output yet — this lets the AI output contract
// validate likelyPartCategoryCodes against a real enum instead of free text.
// (requiredServiceCodes used to have an equivalent placeholder — SERVICE_CODES
// — here too, but Sprint 21 retired it in favor of the real ServiceType enum
// now that GarageService exists and can actually be matched against a
// diagnosis; see features/diagnostics/schemas.ts.)
export const PART_CATEGORY_CODES = [
  "BRAKE_PADS",
  "BRAKE_DISCS",
  "BRAKE_FLUID",
  "ENGINE_OIL",
  "OIL_FILTER",
  "AIR_FILTER",
  "FUEL_FILTER",
  "SPARK_PLUGS",
  "BATTERY",
  "ALTERNATOR",
  "STARTER_MOTOR",
  "TIMING_BELT",
  "SERPENTINE_BELT",
  "RADIATOR",
  "COOLANT",
  "THERMOSTAT",
  "SHOCK_ABSORBER",
  "SUSPENSION_ARM",
  "WHEEL_BEARING",
  "TYRE",
  "AC_COMPRESSOR",
  "AC_REFRIGERANT",
  "TRANSMISSION_FLUID",
  "CLUTCH_KIT",
  "EXHAUST_COMPONENT",
  "SENSOR",
  "WIPER_BLADE",
  "BULB",
  "OTHER",
] as const;

export const partCategoryCodeSchema = z.enum(PART_CATEGORY_CODES);
