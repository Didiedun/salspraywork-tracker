// ─── Malaysian statutory payroll contributions ───────────────────────────────
//
// These follow the official PUBLISHED SCHEDULES, not flat percentages. KWSP
// mandates the Third Schedule (EPF Act 1991) — not exact % — for wages ≤ RM20,000,
// and PERKESO uses the Jadual Ketiga contribution table for SOCSO/EIS. The
// functions below reproduce those tables by formula, verified against published
// rows on 2026-06-16:
//   SOCSO  RM6,000 band → employer 104.15 / employee 29.75
//          RM5,000 band → employer  86.65 / employee 24.75
//   EIS    RM6,000 band → 11.90 each side
// The SOCSO/EIS insured-wage ceiling was raised RM5,000 → RM6,000 on 1 Oct 2024.
//
// NOTE: spot-check against the official KWSP and PERKESO calculators before using
// these figures for an actual statutory submission. Every amount stays editable
// in the payroll run until it is finalised (manual override).

const SOCSO_EIS_CEILING = 6000

const round2 = (v) => Math.round(v * 100) / 100

// Round UP to the next whole ringgit (EPF contributions are whole-ringgit).
const ceilRinggit = (ringgit) => Math.ceil(Math.round(ringgit * 100) / 100)

// Round UP to the next 5 sen (PERKESO contribution rounding). Works in half-sen
// integers first to avoid floating-point drift on exact boundaries.
const ceil5sen = (ringgit) => Math.ceil(Math.round(ringgit * 200) / 10) * 5 / 100

// EPF / KWSP — Third Schedule.
// Wages ≤ RM20,000 are banded in RM20 steps and the contribution is taken on the
// band ceiling; above RM20,000 the exact wage is used. Both shares round up to
// the next ringgit. Employer rate is 13% for wages ≤ RM5,000, otherwise 12%;
// employee rate is 11%.
function calcEpf(wage) {
  if (wage <= 0) return { epf_employee: 0, epf_employer: 0 }
  const base = wage <= 20000 ? Math.ceil(wage / 20) * 20 : wage
  const employerRate = wage <= 5000 ? 0.13 : 0.12
  return {
    epf_employee: ceilRinggit(base * 0.11),
    epf_employer: ceilRinggit(base * employerRate),
  }
}

// Band midpoint for the RM100-step PERKESO bands, capped at the insured ceiling.
// (Valid for wages ≥ RM100, which covers all real salaries; the four sub-RM100
// bands in the official table are not modelled.)
function bandMidpoint(wage) {
  const capped = Math.min(wage, SOCSO_EIS_CEILING)
  return Math.ceil(capped / 100) * 100 - 50
}

// SOCSO Category 1 (Employment Injury + Invalidity) — Jadual Ketiga.
// Employee 0.5%, employer 1.75% of the band midpoint, rounded up to 5 sen.
function calcSocso(wage) {
  if (wage <= 0) return { socso_employee: 0, socso_employer: 0 }
  const mid = bandMidpoint(wage)
  return {
    socso_employee: ceil5sen(mid * 0.005),
    socso_employer: ceil5sen(mid * 0.0175),
  }
}

// EIS / SIP — same band structure, 0.2% each side.
function calcEis(wage) {
  if (wage <= 0) return { eis_employee: 0, eis_employer: 0 }
  const mid = bandMidpoint(wage)
  return {
    eis_employee: ceil5sen(mid * 0.002),
    eis_employer: ceil5sen(mid * 0.002),
  }
}

export function calcContributions(grossSalary, isEpf = true, isSocso = true, isEis = true) {
  const epf   = isEpf   ? calcEpf(grossSalary)   : { epf_employee: 0, epf_employer: 0 }
  const socso = isSocso ? calcSocso(grossSalary) : { socso_employee: 0, socso_employer: 0 }
  const eis   = isEis   ? calcEis(grossSalary)   : { eis_employee: 0, eis_employer: 0 }
  return { ...epf, ...socso, ...eis }
}

export function calcEntry(basic, allowances, pcb, otherDeductions, isEpf, isSocso, isEis) {
  const gross = round2(Number(basic) + Number(allowances))
  const c = calcContributions(gross, isEpf, isSocso, isEis)
  const totalEmpDeductions =
    c.epf_employee + c.socso_employee + c.eis_employee + Number(pcb) + Number(otherDeductions)
  return {
    gross_salary: gross,
    ...c,
    net_salary: round2(gross - totalEmpDeductions),
  }
}
