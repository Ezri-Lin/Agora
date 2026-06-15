import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { RoleMessage } from "./RoleMessage.js";
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

function makeMessage(overrides: Partial<CouncilMessage> = {}): CouncilMessage {
  return {
    id: "msg-1",
    roomId: "room-1",
    senderType: "role",
    senderId: "skeptic_critic",
    content: "We should validate the source before writing.",
    createdAt: "2026-06-10T02:30:00.000Z",
    ...overrides,
  };
}

describe("RoleMessage", () => {
  it("renders thinking as visible process rows", () => {
    renderWithProviders(
      <RoleMessage
        message={makeMessage({
          thinking: "Reading selected document\nChecking memory\nPreparing summary",
        })}
        roles={roles}
        expanded
      />,
    );

    expect(screen.getByText("Thinking process")).toBeInTheDocument();
    expect(screen.getByText("Reading selected document")).toBeInTheDocument();
    expect(screen.getByText("Checking memory")).toBeInTheDocument();
    expect(screen.getByText("Preparing summary")).toBeInTheDocument();
  });

  it("expands the raw thinking detail on request", async () => {
    renderWithProviders(
      <RoleMessage
        message={makeMessage({
          thinking: "Reading selected document\nChecking memory",
        })}
        roles={roles}
        expanded
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show thinking detail" }));
    expect(screen.getByText("Raw thinking detail")).toBeInTheDocument();
  });

  it("keeps collapsed role messages to a summary preview", () => {
    renderWithProviders(
      <RoleMessage
        message={makeMessage({ graphSummary: "Validation is required before writing." })}
        roles={roles}
        expanded={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText(/Validation is required before writing/)).toBeInTheDocument();
    expect(screen.queryByText("We should validate the source before writing.")).not.toBeInTheDocument();
  });
});
