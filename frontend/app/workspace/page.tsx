import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const metadata: Metadata = {
  title: "Workspace — SATQUERY",
};

export default function WorkspacePage() {
  return <WorkspaceShell />;
}
