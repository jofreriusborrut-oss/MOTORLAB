/** Tipus de dades compartits per tota la lògica física. */

export type EngineType = 'gasolina-atm' | 'gasolina-turbo' | 'diesel' | 'electric';

export interface CurvePoint {
  rpm: number;
  torque: number; // Nm
}

export interface EngineConfig {
  name: string;
  type: EngineType;
  displacementCc: number; // cc (0 per a elèctric)
  cylinders: number; // 0 per a elèctric
  maxRpm: number; // règim de tall
  idleRpm: number; // ralentí (0 per a elèctric)
  declaredConsumption: number; // L/100 km o kWh/100 km (valor declarat)
  torqueCurve: CurvePoint[];
}

export interface VehicleConfig {
  massKg: number; // massa en ordre de marxa + conductor
  gearRatios: number[];
  finalDrive: number;
  wheelRadiusM: number;
  cx: number;
  frontalAreaM2: number;
  rollingCoef: number; // Crr
  drivetrainEfficiency: number; // 0..1
  drivenAxleLoad: number; // fracció del pes sobre l'eix motriu (0..1)
  tyreGrip: number; // coeficient d'adherència µ
  shiftTimeS: number; // temps de canvi de marxa
}

export interface Configuration {
  id: string;
  name: string;
  engine: EngineConfig;
  vehicle: VehicleConfig;
  builtIn?: boolean;
}

export type IssueLevel = 'error' | 'avis';

export interface Issue {
  level: IssueLevel;
  field: string;
  /** Codi del missatge; el text es tradueix a la interfície (clau `issue.<code>`). */
  code: string;
  params?: Record<string, number | string>;
}
