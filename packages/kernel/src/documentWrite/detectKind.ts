/**
 * Detect document kind from file extension.
 */

export function detectKind(path: string): "markdown" | "text" | "json" | "yaml" | "code" {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
    case "markdown":
      return "markdown";
    case "json":
      return "json";
    case "yaml":
    case "yml":
      return "yaml";
    case "txt":
    case "text":
      return "text";
    default:
      return "code";
  }
}
