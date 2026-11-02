/**
 * API Service for VoiceStress backend communication.
 */

export async function analyzeAudio(audioBlobOrFile, filename = "recording.webm") {
  const formData = new FormData();
  
  if (audioBlobOrFile instanceof File) {
    formData.append("file", audioBlobOrFile);
  } else {
    formData.append("file", audioBlobOrFile, filename);
  }

  const response = await fetch("/analyze", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.detail || data.error || `Analysis failed (HTTP ${response.status})`;
    const error = new Error(errorMsg);
    error.code = data.code || "API_ERROR";
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function fetchHealth() {
  try {
    const res = await fetch("/health");
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    console.error("Health check error:", err);
    return { status: "error", model_loaded: false };
  }
}

export async function fetchModelInfo() {
  try {
    const res = await fetch("/api/model-info");
    if (!res.ok) throw new Error("Failed to fetch model info");
    return await res.json();
  } catch (err) {
    console.error("Model info fetch error:", err);
    return null;
  }
}
