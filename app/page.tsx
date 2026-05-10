"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { EnrichmentCandidate, EnrichmentResult } from "@/lib/types";

type RequestState = "idle" | "loading" | "creating" | "success" | "error";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("未達");
  const [review, setReview] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPassword(window.sessionStorage.getItem("app-password") || "");
  }, []);

  const selectedCandidate = useMemo(() => {
    return result?.candidates.find((candidate) => candidate.id === selectedId) || result?.selectedCandidate;
  }, [result, selectedId]);

  async function handleEnrich(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    setResult(null);
    setSelectedId(null);

    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: requestHeaders(password),
        body: JSON.stringify({ url })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "候補取得に失敗しました");
      }

      setResult(body);
      setSelectedId(body.selectedCandidate?.id || body.candidates?.[0]?.id || null);
      setState("idle");
      window.sessionStorage.setItem("app-password", password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setState("error");
    }
  }

  async function handleCreate() {
    if (!result || !selectedCandidate) {
      return;
    }

    setState("creating");
    setMessage("");

    try {
      const response = await fetch("/api/notion/create", {
        method: "POST",
        headers: requestHeaders(password),
        body: JSON.stringify({
          inputUrl: result.normalizedUrl,
          candidate: selectedCandidate,
          status,
          review: review.trim() || undefined
        })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Notionへの追加に失敗しました");
      }

      setState("success");
      setMessage(`Notionに追加しました: ${body.pageId}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <div className="entry">
          <div>
            <p className="eyebrow">Notion Restaurant Assistant</p>
            <h1>行きたいお店リスト補完</h1>
          </div>

          <form className="url-form" onSubmit={handleEnrich}>
            <label className="field">
              <span>URL</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                inputMode="url"
                required
              />
            </label>
            <label className="field">
              <span>APP_PASSWORD</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>
            <button className="primary" disabled={state === "loading" || state === "creating"}>
              {state === "loading" ? "取得中" : "候補取得"}
            </button>
          </form>
        </div>

        {message ? <p className={`message ${state}`}>{message}</p> : null}

        {result ? (
          <section className="results">
            <div className="result-head">
              <div>
                <p className="eyebrow">Candidates</p>
                <h2>補完候補</h2>
              </div>
              <button
                className="secondary"
                onClick={handleCreate}
                disabled={!selectedCandidate || state === "creating"}
              >
                {state === "creating" ? "追加中" : "Notionに追加"}
              </button>
            </div>

            <div className="details-form" aria-label="Notionに追加する内容">
              <label className="field">
                <span>ステータス</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="未達">未達</option>
                  <option value="食了">食了</option>
                  <option value="リピあり">リピあり</option>
                </select>
              </label>
              <label className="field review-field">
                <span>感想</span>
                <textarea
                  value={review}
                  onChange={(event) => setReview(event.target.value)}
                  placeholder="例: 前通って美味しそうだった"
                  rows={3}
                />
              </label>
            </div>

            {result.warnings.length > 0 ? (
              <div className="warnings">
                {result.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="candidate-grid">
              {result.candidates.map((candidate) => (
                <CandidateButton
                  key={candidate.id}
                  candidate={candidate}
                  selected={candidate.id === selectedCandidate?.id}
                  onSelect={() => setSelectedId(candidate.id)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function CandidateButton({
  candidate,
  selected,
  onSelect
}: {
  candidate: EnrichmentCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  const confidencePercent = Math.round(candidate.confidence * 100);

  return (
    <button className={`candidate ${selected ? "selected" : ""}`} onClick={onSelect} type="button">
      <span className="candidate-top">
        <span className="source">{candidate.sourceLabel}</span>
        <span className="confidence">{confidencePercent}%</span>
      </span>
      <span className="candidate-name">{candidate.name || "店名候補なし"}</span>
      <span className="candidate-meta">
        <span>{candidate.category || "カテゴリ未推定"}</span>
        <span>{candidate.location || candidate.address || "場所未推定"}</span>
      </span>
      <span className="reason">{candidate.reason}</span>
    </button>
  );
}

function requestHeaders(password: string): HeadersInit {
  return {
    "content-type": "application/json",
    ...(password ? { "x-app-password": password } : {})
  };
}
