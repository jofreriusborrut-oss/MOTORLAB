import type { Configuration, EngineType, VehicleConfig } from '../physics/types';

/**
 * Configuracions de mostra. Les corbes de parell són representatives de cada
 * família de motors (no corresponen a cap model comercial concret).
 */

const sedan = (over: Partial<VehicleConfig>): VehicleConfig => ({
  massKg: 1350,
  gearRatios: [3.54, 2.05, 1.38, 1.03, 0.82, 0.69],
  finalDrive: 3.94,
  wheelRadiusM: 0.316,
  cx: 0.29,
  frontalAreaM2: 2.2,
  rollingCoef: 0.011,
  drivetrainEfficiency: 0.92,
  drivenAxleLoad: 0.6,
  tyreGrip: 1.0,
  shiftTimeS: 0.35,
  ...over,
});

export const PRESETS: Configuration[] = [
  {
    id: 'preset-atm',
    name: 'Gasolina atmosfèric 2.0',
    builtIn: true,
    engine: {
      name: '2.0 atmosfèric 16V',
      type: 'gasolina-atm',
      displacementCc: 1998,
      cylinders: 4,
      maxRpm: 6800,
      idleRpm: 800,
      declaredConsumption: 7.2,
      torqueCurve: [
        { rpm: 800, torque: 128 },
        { rpm: 1500, torque: 150 },
        { rpm: 2500, torque: 175 },
        { rpm: 3500, torque: 190 },
        { rpm: 4500, torque: 200 },
        { rpm: 5200, torque: 196 },
        { rpm: 6000, torque: 182 },
        { rpm: 6800, torque: 160 },
      ],
    },
    vehicle: sedan({ massKg: 1320 }),
  },
  {
    id: 'preset-turbo',
    name: 'Gasolina turbo 1.5',
    builtIn: true,
    engine: {
      name: '1.5 TSI turbo',
      type: 'gasolina-turbo',
      displacementCc: 1498,
      cylinders: 4,
      maxRpm: 6200,
      idleRpm: 750,
      declaredConsumption: 6.1,
      torqueCurve: [
        { rpm: 750, torque: 120 },
        { rpm: 1250, torque: 190 },
        { rpm: 1500, torque: 250 },
        { rpm: 3500, torque: 250 },
        { rpm: 4500, torque: 232 },
        { rpm: 5500, torque: 206 },
        { rpm: 6200, torque: 180 },
      ],
    },
    vehicle: sedan({ massKg: 1380, gearRatios: [3.77, 2.09, 1.32, 0.98, 0.84, 0.70, 0.56], finalDrive: 4.24, shiftTimeS: 0.15 }),
  },
  {
    id: 'preset-diesel',
    name: 'Dièsel 2.0 TDI',
    builtIn: true,
    engine: {
      name: '2.0 dièsel common-rail',
      type: 'diesel',
      displacementCc: 1968,
      cylinders: 4,
      maxRpm: 4800,
      idleRpm: 800,
      declaredConsumption: 5.0,
      torqueCurve: [
        { rpm: 800, torque: 140 },
        { rpm: 1250, torque: 260 },
        { rpm: 1750, torque: 340 },
        { rpm: 2750, torque: 340 },
        { rpm: 3500, torque: 300 },
        { rpm: 4200, torque: 245 },
        { rpm: 4800, torque: 170 },
      ],
    },
    vehicle: sedan({ massKg: 1480, gearRatios: [3.77, 2.0, 1.27, 0.93, 0.74, 0.61], finalDrive: 3.45 }),
  },
  {
    id: 'preset-electric',
    name: 'Elèctric 150 kW',
    builtIn: true,
    engine: {
      name: 'Síncron d\'imants permanents',
      type: 'electric',
      displacementCc: 0,
      cylinders: 0,
      maxRpm: 16000,
      idleRpm: 0,
      declaredConsumption: 16.5,
      torqueCurve: [
        { rpm: 0, torque: 310 },
        { rpm: 4620, torque: 310 },
        { rpm: 5000, torque: 286 },
        { rpm: 5500, torque: 260 },
        { rpm: 6000, torque: 239 },
        { rpm: 7000, torque: 205 },
        { rpm: 8000, torque: 179 },
        { rpm: 9000, torque: 159 },
        { rpm: 10000, torque: 143 },
        { rpm: 12000, torque: 119 },
        { rpm: 14000, torque: 96 },
        { rpm: 16000, torque: 72 },
      ],
    },
    vehicle: sedan({
      massKg: 1850,
      gearRatios: [1],
      finalDrive: 11.5,
      wheelRadiusM: 0.334,
      cx: 0.27,
      frontalAreaM2: 2.36,
      rollingCoef: 0.009,
      drivetrainEfficiency: 0.97,
      drivenAxleLoad: 0.52,
      shiftTimeS: 0,
    }),
  },
];

/** Valors per defecte quan es canvia el tipus de motor. */
export const TYPE_DEFAULTS: Record<EngineType, { idleRpm: number; maxRpm: number }> = {
  'gasolina-atm': { idleRpm: 800, maxRpm: 6800 },
  'gasolina-turbo': { idleRpm: 750, maxRpm: 6200 },
  diesel: { idleRpm: 800, maxRpm: 4800 },
  electric: { idleRpm: 0, maxRpm: 16000 },
};
