/** True when built as a hosted claude.ai artifact (sandboxed frame: no print, downloads or path routing). */
export const IS_ARTIFACT = import.meta.env.VITE_ARTIFACT === "1";
