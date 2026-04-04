import type { ActorRole } from "@/domain/models";
import { UnauthorizedError } from "@/domain/repositories";

export function assertAdminActorRole(
  actorRole: ActorRole,
  message = "You do not have permission to perform this admin operation."
): void {
  if (actorRole !== "ADMIN") {
    throw new UnauthorizedError(message);
  }
}
