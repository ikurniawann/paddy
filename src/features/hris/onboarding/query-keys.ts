export const onboardingQueryKeys = {
  all: ["hris", "onboarding"] as const,
  employee: (employeeId: string) =>
    ["hris", "onboarding", "employee", employeeId] as const,
};
