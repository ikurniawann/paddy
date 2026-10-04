export const offboardingQueryKeys = {
  all: ["hris", "offboarding"] as const,
  employee: (employeeId: string) =>
    ["hris", "offboarding", "employee", employeeId] as const,
  record: (employeeId: string) =>
    ["hris", "offboarding", "record", employeeId] as const,
};
