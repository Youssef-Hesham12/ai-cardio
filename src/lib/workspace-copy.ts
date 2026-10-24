// Normalize legacy placeholder wording for display without rewriting saved records.
export function workspaceText(value: string | undefined | null): string {
  return (value || "")
    .replace(/\bDEMO-(\d+\.\d+)\b/g, "$1")
    .replace(/\bDemo Patient (\d+)\b/g, "Patient $1")
    .replace("CardioAssist Academic Clinic", "CardioAssist Clinic")
    .replace(
      "Routine follow-up. Illustrative inputs supplied for the academic demo.",
      "Routine follow-up.",
    )
    .replace("Demo record reviewed.", "Record reviewed.")
    .replace(
      "Connected through the simulated patient mobile app.",
      "Patient-app connection.",
    )
    .replace(
      "Fictional mobile connection request.",
      "Patient-app connection request.",
    )
    .replace(
      "Please connect my demo patient account.",
      "Please connect my patient account.",
    )
    .replace(/\bnew synthetic assessment\b/g, "new assessment")
    .replace(/\bdemo assessment\b/g, "assessment")
    .replace(/\bdemo review\b/g, "review")
    .replace(/\bDemo review status\b/g, "Review status")
    .replace(/\billustrative assessment inputs\b/g, "assessment inputs")
    .replace("The demo request failed.", "The request failed.")
    .replace(
      "The demo simulator is unavailable.",
      "The scenario simulator is unavailable.",
    );
}
