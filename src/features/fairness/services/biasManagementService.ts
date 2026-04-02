import type {
  BiasBalance,
  BiasLedger,
  EntityId,
  YearMonthString
} from "@/domain/models";
import { notImplemented } from "@/shared/lib/notImplemented";

export interface AdjustBiasInput {
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly delta: BiasBalance;
  readonly reason: string;
}

export interface BiasManagementService {
  listBiasLedgers(effectiveMonth: YearMonthString): Promise<ReadonlyArray<BiasLedger>>;
  adjustBias(input: AdjustBiasInput): Promise<BiasLedger>;
  resetDoctorBias(doctorId: EntityId, effectiveMonth: YearMonthString): Promise<BiasLedger>;
  resetAllBias(effectiveMonth: YearMonthString): Promise<ReadonlyArray<BiasLedger>>;
}

export function createBiasManagementServicePlaceholder(): BiasManagementService {
  return {
    async listBiasLedgers() {
      throw notImplemented("BiasManagementService.listBiasLedgers");
    },
    async adjustBias() {
      throw notImplemented("BiasManagementService.adjustBias");
    },
    async resetDoctorBias() {
      throw notImplemented("BiasManagementService.resetDoctorBias");
    },
    async resetAllBias() {
      throw notImplemented("BiasManagementService.resetAllBias");
    }
  };
}

