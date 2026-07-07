import { createFileRoute } from "@tanstack/react-router";
import PaymentCancelPage from "../pages/PaymentCancelPage";

export const Route = createFileRoute("/checkout/cancel")({ component: PaymentCancelPage });
