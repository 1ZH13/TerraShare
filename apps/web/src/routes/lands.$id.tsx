import { createFileRoute } from "@tanstack/react-router";
import LandDetailPage from "../pages/LandDetailPage";

export const Route = createFileRoute("/lands/$id")({ component: LandDetailPage });
