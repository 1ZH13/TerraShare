import { createFileRoute } from "@tanstack/react-router";
import StyleguidePage from "../pages/StyleguidePage";

export const Route = createFileRoute("/styleguide")({ component: StyleguidePage });
