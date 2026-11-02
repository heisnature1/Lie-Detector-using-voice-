/**
 * API Service for VoiceStress backend communication.
 */

export async function analyzeSession(baselineBlob, testBlob) {
  const formData = new FormData();
  formData.append("baseline_file", baselineBlob, "baseline.webm");
  formData.append("test_file", testBlob, "test_response.webm");

  const response = await fetch("/analyze/session", {
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

export async function analyzeSingleAudio(audioBlobOrFile, filename = "recording.webm") {
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

export async function submitDatasetSession({
  baselineBlob,
  testBlob,
  label,
  speakerId,
  promptQuestion,
  consentGiven,
}) {
  const formData = new FormData();
  formData.append("baseline_file", baselineBlob, "baseline.webm");
  formData.append("test_file", testBlob, "test.webm");
  formData.append("label", label);
  formData.append("speaker_id", speakerId || "anonymous");
  formData.append("prompt_question", promptQuestion || "General inquiry");
  formData.append("consent_given", consentGiven ? "true" : "false");

  const response = await fetch("/api/dataset/collect", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to submit training sample");
  }
  return data;
}

export async function fetchDatasetStats() {
  try {
    const res = await fetch("/api/dataset/stats");
    if (!res.ok) throw new Error("Failed to fetch dataset stats");
    return await res.json();
  } catch (err) {
    console.error("Dataset stats error:", err);
    return { total_sessions: 0, truthful_count: 0, deceptive_count: 0 };
  }
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
