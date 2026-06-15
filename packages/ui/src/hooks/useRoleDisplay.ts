import { useI18n } from "../i18n/I18nContext.js";

interface RoleDisplayInput {
  name: string;
  nameCN?: string;
  subtitle: string;
  subtitleCN?: string;
}

export interface RoleDisplay {
  displayName: string;
  displaySubtitle: string;
}

/**
 * Returns locale-aware name and subtitle for a role.
 * Uses nameCN/subtitleCN when locale is "zh", falls back to name/subtitle.
 */
export function useRoleDisplay(role: RoleDisplayInput): RoleDisplay {
  const { locale } = useI18n();

  return {
    displayName: locale === "zh" && role.nameCN ? role.nameCN : role.name,
    displaySubtitle: locale === "zh" && role.subtitleCN ? role.subtitleCN : role.subtitle,
  };
}
