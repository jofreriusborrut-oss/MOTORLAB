import { BMEP_RANGE, isElectric } from './constants';
import { bmepBar, createEngineModel, type EngineModel } from './engine';
import { sortCurve } from './interpolation';
import type { EngineConfig, Issue, VehicleConfig } from './types';

const err = (field: string, message: string): Issue => ({ level: 'error', field, message });
const warn = (field: string, message: string): Issue => ({ level: 'avis', field, message });
const fin = (x: number) => typeof x === 'number' && Number.isFinite(x);

/**
 * Valida el motor. Els errors impedeixen calcular; els avisos indiquen
 * valors possibles però poc habituals o físicament dubtosos.
 */
export function validateEngine(e: EngineConfig, model?: EngineModel): Issue[] {
  const out: Issue[] = [];
  const electric = isElectric(e.type);

  if (!fin(e.maxRpm) || e.maxRpm <= 0) out.push(err('maxRpm', 'El règim màxim ha de ser un valor positiu.'));
  if (!electric) {
    if (!fin(e.displacementCc) || e.displacementCc < 50) out.push(err('displacementCc', 'La cilindrada ha de ser com a mínim de 50 cc.'));
    if (!fin(e.cylinders) || e.cylinders < 1 || !Number.isInteger(e.cylinders)) out.push(err('cylinders', 'El nombre de cilindres ha de ser un enter ≥ 1.'));
    if (!fin(e.idleRpm) || e.idleRpm <= 0) out.push(err('idleRpm', 'El ralentí ha de ser positiu.'));
    else if (e.idleRpm >= e.maxRpm * 0.5) out.push(err('idleRpm', 'El ralentí ha de ser molt inferior al règim màxim.'));
    else if (e.idleRpm < 500 || e.idleRpm > 1300) out.push(warn('idleRpm', 'Ralentí poc habitual (típic: 600–1000 rpm).'));
    if (e.maxRpm > 10000) out.push(warn('maxRpm', 'Més de 10.000 rpm només és habitual en motors de competició.'));
    if (fin(e.displacementCc) && fin(e.cylinders) && e.cylinders >= 1) {
      const perCyl = e.displacementCc / e.cylinders;
      if (perCyl < 150 || perCyl > 1000) out.push(warn('cylinders', `Cilindrada unitària de ${Math.round(perCyl)} cc: fora del rang habitual (200–800 cc).`));
    }
  } else if (e.maxRpm > 25000) {
    out.push(warn('maxRpm', 'Règim molt elevat fins i tot per a un motor elèctric.'));
  }
  if (!fin(e.declaredConsumption) || e.declaredConsumption <= 0) out.push(err('declaredConsumption', 'El consum declarat ha de ser positiu.'));

  const pts = sortCurve(e.torqueCurve);
  if (pts.length < 2) out.push(err('torqueCurve', 'La corba de parell necessita com a mínim 2 punts vàlids.'));
  if (pts.length !== e.torqueCurve.length) out.push(warn('torqueCurve', 'Hi ha punts duplicats o no vàlids que s\'ignoren.'));
  if (pts.some((p) => p.torque < 0)) out.push(err('torqueCurve', 'El parell no pot ser negatiu.'));
  if (pts.length >= 2) {
    const first = pts[0].rpm;
    const last = pts[pts.length - 1].rpm;
    if (!electric && first > e.idleRpm) out.push(warn('torqueCurve', `La corba comença a ${first} rpm, per sobre del ralentí: s'hi manté el primer valor.`));
    if (electric && first > 0) out.push(warn('torqueCurve', "La corba d'un motor elèctric hauria de començar a 0 rpm."));
    if (last < e.maxRpm) out.push(warn('torqueCurve', `La corba acaba a ${last} rpm (règim màxim ${e.maxRpm}): s'hi manté el darrer valor.`));
    if (pts.every((p) => p.torque === 0)) out.push(err('torqueCurve', 'La corba de parell és nul·la.'));
  }

  if (out.some((i) => i.level === 'error')) return out;

  const m = model ?? createEngineModel(e);
  if (!electric) {
    const bmep = bmepBar(m.peakTorque.torque, e.displacementCc);
    const range = BMEP_RANGE[e.type as keyof typeof BMEP_RANGE];
    if (bmep > range.max * 1.25) {
      out.push(err('torqueCurve', `Pressió mitjana efectiva de ${bmep.toFixed(1)} bar: físicament inviable per a aquest tipus de motor (màx. realista ≈ ${range.max} bar).`));
    } else if (bmep > range.max) {
      out.push(warn('torqueCurve', `BMEP de ${bmep.toFixed(1)} bar: només a l'abast de motors de competició.`));
    } else if (bmep < range.typical[0] * 0.6) {
      out.push(warn('torqueCurve', `BMEP de ${bmep.toFixed(1)} bar: parell molt baix per a aquesta cilindrada.`));
    }
    const cvPerL = m.peakPower.cv / (e.displacementCc / 1000);
    if (cvPerL > 250) out.push(warn('torqueCurve', `Potència específica de ${Math.round(cvPerL)} CV/L: pròpia de competició.`));
  }
  return out;
}

export function validateVehicle(v: VehicleConfig, electric: boolean): Issue[] {
  const out: Issue[] = [];
  if (!fin(v.massKg) || v.massKg < 50) out.push(err('massKg', 'La massa ha de ser com a mínim de 50 kg.'));
  else if (v.massKg < 500 || v.massKg > 4000) out.push(warn('massKg', 'Massa fora del rang d\'un turisme (500–4000 kg).'));
  if (!Array.isArray(v.gearRatios) || v.gearRatios.length < 1) out.push(err('gearRatios', 'Cal com a mínim una marxa.'));
  else {
    if (v.gearRatios.some((r) => !fin(r) || r <= 0)) out.push(err('gearRatios', 'Totes les relacions de marxa han de ser positives.'));
    for (let i = 1; i < v.gearRatios.length; i++) {
      if (v.gearRatios[i] >= v.gearRatios[i - 1]) {
        out.push(err('gearRatios', `La marxa ${i + 1} ha de ser més llarga (relació menor) que la ${i}.`));
        break;
      }
    }
    if (!electric && v.gearRatios.length === 1) out.push(warn('gearRatios', 'Un motor tèrmic amb una sola marxa tindrà una sortida molt limitada.'));
  }
  if (!fin(v.finalDrive) || v.finalDrive <= 0) out.push(err('finalDrive', 'La relació del diferencial ha de ser positiva.'));
  if (!fin(v.wheelRadiusM) || v.wheelRadiusM <= 0.1) out.push(err('wheelRadiusM', 'El radi de roda ha de ser superior a 0,1 m.'));
  else if (v.wheelRadiusM > 0.6) out.push(warn('wheelRadiusM', 'Radi de roda poc habitual per a un turisme.'));
  if (!fin(v.cx) || v.cx <= 0) out.push(err('cx', 'El Cx ha de ser positiu.'));
  else if (v.cx < 0.18 || v.cx > 1.0) out.push(warn('cx', 'Cx fora del rang habitual (0,20–0,45 per a turismes).'));
  if (!fin(v.frontalAreaM2) || v.frontalAreaM2 <= 0) out.push(err('frontalAreaM2', 'La superfície frontal ha de ser positiva.'));
  else if (v.frontalAreaM2 < 1.2 || v.frontalAreaM2 > 4) out.push(warn('frontalAreaM2', 'Superfície frontal poc habitual (1,8–3 m²).'));
  if (!fin(v.rollingCoef) || v.rollingCoef <= 0) out.push(err('rollingCoef', 'El coeficient de rodament ha de ser positiu.'));
  else if (v.rollingCoef > 0.03) out.push(warn('rollingCoef', 'Resistència al rodament molt alta (asfalt típic: 0,008–0,015).'));
  if (!fin(v.drivetrainEfficiency) || v.drivetrainEfficiency <= 0.5 || v.drivetrainEfficiency > 1)
    out.push(err('drivetrainEfficiency', 'El rendiment de la transmissió ha d\'estar entre 0,5 i 1.'));
  if (!fin(v.drivenAxleLoad) || v.drivenAxleLoad <= 0 || v.drivenAxleLoad > 1)
    out.push(err('drivenAxleLoad', 'La fracció de pes a l\'eix motriu ha d\'estar entre 0 i 1.'));
  if (!fin(v.tyreGrip) || v.tyreGrip <= 0) out.push(err('tyreGrip', 'El coeficient d\'adherència ha de ser positiu.'));
  else if (v.tyreGrip > 1.6) out.push(warn('tyreGrip', 'Adherència superior a 1,6: només amb pneumàtics de competició.'));
  if (!fin(v.shiftTimeS) || v.shiftTimeS < 0 || v.shiftTimeS > 3) out.push(err('shiftTimeS', 'El temps de canvi ha d\'estar entre 0 i 3 s.'));
  return out;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === 'error');
