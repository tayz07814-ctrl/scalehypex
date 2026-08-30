import { DurableObject } from "cloudflare:workers"

/**
 * Placeholder for the Durable Object binding left by the container attempt.
 * Downloads now go through the tikwm API; kept until the binding can be
 * retired (requires a paid plan or a delete-class migration).
 */
export class YtDlpContainer extends DurableObject {}
