const roundSen = (v) => Math.round(v * 100) / 100

// Malaysian statutory contribution rates (2024)
// EPF: employee 11%, employer 13% (salary ≤ RM5000) or 12% (> RM5000)
// SOCSO First Category: employee 0.5%, employer 1.75%, ceiling RM5000
// EIS (SIP): employee 0.2%, employer 0.2%, ceiling RM5000
export function calcContributions(grossSalary, isEpf = true, isSocso = true, isEis = true) {
  const socsoBase = Math.min(grossSalary, 5000)
  const eisBase   = Math.min(grossSalary, 5000)

  return {
    epf_employee:   isEpf   ? roundSen(grossSalary * 0.11)                              : 0,
    epf_employer:   isEpf   ? roundSen(grossSalary * (grossSalary <= 5000 ? 0.13 : 0.12)) : 0,
    socso_employee: isSocso ? roundSen(socsoBase * 0.005)                               : 0,
    socso_employer: isSocso ? roundSen(socsoBase * 0.0175)                              : 0,
    eis_employee:   isEis   ? roundSen(eisBase * 0.002)                                 : 0,
    eis_employer:   isEis   ? roundSen(eisBase * 0.002)                                 : 0,
  }
}

export function calcEntry(basic, allowances, pcb, otherDeductions, isEpf, isSocso, isEis) {
  const gross = roundSen(basic + allowances)
  const c = calcContributions(gross, isEpf, isSocso, isEis)
  const totalEmpDeductions = c.epf_employee + c.socso_employee + c.eis_employee + pcb + otherDeductions
  return {
    gross_salary:      gross,
    ...c,
    net_salary: roundSen(gross - totalEmpDeductions),
  }
}
