export type StudyMode = "comprehensive" | "quick" | "key_points"

export const STUDY_MODES: { value: StudyMode; label: string; description: string }[] = [
  { value: "comprehensive", label: "Comprehensive Notes", description: "Overview plus a full, detailed key points list" },
  { value: "quick", label: "Quick Summary", description: "An explained, detailed paragraph summary — no bullet list" },
  { value: "key_points", label: "Key Points Only", description: "Skip the overview, just the key points" },
]

export const DEFAULT_STUDY_MODE: StudyMode = "comprehensive"

const PREFS_KEY = "notetube_prefs"

export function getStoredStudyMode(): StudyMode {
  if (typeof window === "undefined") return DEFAULT_STUDY_MODE
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")
    const mode = stored.studyMode
    return STUDY_MODES.some((m) => m.value === mode) ? mode : DEFAULT_STUDY_MODE
  } catch {
    return DEFAULT_STUDY_MODE
  }
}

export function setStoredStudyMode(mode: StudyMode) {
  if (typeof window === "undefined") return
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...stored, studyMode: mode }))
  } catch {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ studyMode: mode }))
  }
}
