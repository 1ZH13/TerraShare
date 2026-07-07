import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "../components/route-guards";
import OnboardingPage from "../pages/OnboardingPage";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <ProtectedRoute><OnboardingPage /></ProtectedRoute>
  ),
});
