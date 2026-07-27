import { AppError } from "@/lib/errors";
import type { MapsProviderName } from "./types";

export class MapsProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: MapsProviderName,
    public readonly transient: boolean,
    details?: unknown,
  ) {
    super(message, "MAPS_PROVIDER_ERROR", 502, details);
    this.name = "MapsProviderError";
  }
}
