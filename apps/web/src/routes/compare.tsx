import { createFileRoute } from "@tanstack/react-router";
import ComparePage from "../pages/ComparePage";

/** Comparador de terrenos (HU-98). Público: la lista vive en localStorage. */
export const Route = createFileRoute("/compare")({
  component: ComparePage,
});
