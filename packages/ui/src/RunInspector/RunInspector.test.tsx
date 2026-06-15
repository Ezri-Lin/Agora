import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { RunInspector } from "./RunInspector.js";
import { ThemeProvider } from "../theme/ThemeContext.js";
import { I18nProvider } from "../i18n/I18nContext.js";

function renderWithProviders(ui: React.ReactElement) {
  localStorage.setItem("agora-locale", "en");
  localStorage.setItem("agora-theme", "light");
  return render(
    <ThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </ThemeProvider>,
  );
}

const roles: RoleCard[] = [
  {
    id: "moderator",
    name: "Moderator",
    nameCN: "主持人",
    subtitle: "Facilitates discussion",
    subtitleCN: "主持讨论",
    type: "moderator",
    systemPrompt: "Facilitate",
    tags: ["core"],
  },
  {
    id: "skeptic_critic",
    name: "Skeptic Critic",
    nameCN: "怀疑者",
    subtitle: "Challenges assumptions",
    subtitleCN: "质疑假设",
    type: "critic",
    systemPrompt: "Challenge assumptions",
    tags: ["risk"],
  },
];

const messages: CouncilMessage[] = [
  {
    id: "msg-1",
    roomId: "room-1",
    senderType: "role",
    senderId: "moderator",
    content: "We should write a summary.",
    createdAt: "2026-06-10T01:00:00.000Z",
  },
];

function makeProps(overrides: Partial<React.ComponentProps<typeof RunInspector>> = {}) {
  return {
    visible: true,
    panelPhase: "running" as const,
    roleStreamStates: new Map([
      ["moderator", { status: "thinking" as const, startedAt: Date.now() - 1200, microSummary: "Reading selected document" }],
    ]),
    lastRoundSnapshot: null,
    roles,
    messages,
    outputs: ["docs/session-summary.md"],
    references: [{ path: "docs/source.md", label: "Source doc" }],
    memoryCount: 2,
    contextDebug: {
      moderatorHasOverflow: false,
      moderatorOverflowDocs: [],
      moderatorIncludedDocCount: 1,
      moderatorTotalChars: 2400,
      roleContextMode: "standard",
      roleTruncatedDocs: 0,
      roleTotalChars: 1200,
      roleDocCount: 1,
    },
    onToggle: vi.fn(),
    onOpenWriteProposals: vi.fn(),
    onOpenMemoryReview: vi.fn(),
    onOpenSessionSummary: vi.fn(),
    ...overrides,
  };
}

describe("RunInspector", () => {
  it("renders the merged run sections as a floating inspector", () => {
    renderWithProviders(<RunInspector {...makeProps()} />);

    expect(screen.getByText("Active roles · 0/1")).toBeInTheDocument();
    expect(screen.getByText("Current run")).toBeInTheDocument();
    expect(screen.getByText("Active roles (1)")).toBeInTheDocument();
    expect(screen.getByText("Sources (1)")).toBeInTheDocument();
    expect(screen.getByText("Outputs (1)")).toBeInTheDocument();
    expect(screen.getByText("Memory (2)")).toBeInTheDocument();
    expect(screen.getByText("Context")).toBeInTheDocument();
  });

  it("exposes review panel entry actions", async () => {
    const onOpenWriteProposals = vi.fn();
    const onOpenMemoryReview = vi.fn();
    const onOpenSessionSummary = vi.fn();

    renderWithProviders(
      <RunInspector
        {...makeProps({
          onOpenWriteProposals,
          onOpenMemoryReview,
          onOpenSessionSummary,
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open write proposals" }));
    await userEvent.click(screen.getByRole("button", { name: "Review memories" }));
    await userEvent.click(screen.getByRole("button", { name: "Open session summary" }));

    expect(onOpenWriteProposals).toHaveBeenCalled();
    expect(onOpenMemoryReview).toHaveBeenCalled();
    expect(onOpenSessionSummary).toHaveBeenCalled();
  });

  it("returns null when hidden", () => {
    const { container } = renderWithProviders(<RunInspector {...makeProps({ visible: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows suggested roles in the merged inspector after a completed run", async () => {
    const onAddPerspective = vi.fn();
    renderWithProviders(
      <RunInspector
        {...makeProps({
          panelPhase: "completed",
          activeRoleIdsFromMessages: new Set(["moderator"]),
          suggestedPerspectives: [
            {
              familyId: "skeptic_critic",
              familyName: "Critic",
              domainId: "risk",
              score: 0.82,
              reason: "Challenge risk assumptions before writing.",
            },
          ],
          onAddPerspective,
        })}
      />,
    );

    expect(screen.getByText("Suggested perspectives")).toBeInTheDocument();
    expect(screen.getByText("Skeptic Critic")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add Skeptic Critic" }));
    expect(onAddPerspective).toHaveBeenCalledWith("skeptic_critic", "Skeptic Critic");
  });
});
