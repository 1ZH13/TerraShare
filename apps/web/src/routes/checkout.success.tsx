import { createFileRoute } from "@tanstack/react-router";
import PaymentSuccessPage from "../pages/PaymentSuccessPage";

export const Route = createFileRoute("/checkout/success")({ component: PaymentSuccessPage });
