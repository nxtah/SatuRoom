import { academyContext } from "@/server/context";
import { ok, route } from "@/server/http";
import { onboardingSteps } from "@/server/onboarding";

export const GET = route(async () => ok({ steps: await onboardingSteps(await academyContext()) }));
