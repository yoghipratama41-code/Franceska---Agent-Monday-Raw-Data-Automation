"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, Database, LoaderCircle, Play, RotateCcw, Settings2, Sparkles } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8010";
const DEFAULT_SHEET = "https://docs.google.com/spreadsheets/d/1wLdsADx0W3IRcA6lGK1kjaSrDci7Z9QqCM7iSU-64TU/";
const DEFAULT_PIPELINE = "https://gns-data-cleaner-v2.vercel.app/";

type WorkflowStage = "setup" | "running" | "success" | "error";
type ProgressState = { progress: number; message: string };
type ResultRows = Record<string, Array<Record<string, unknown>>>;

export default function Home() {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET);
  const [pipelineUrl, setPipelineUrl] = useState(DEFAULT_PIPELINE);
  const [stage, setStage] = useState<WorkflowStage>("setup");
  const [progress, setProgress] = useState<ProgressState>({ progress: 0, message: "Ready for a Franceska run" });
  const [results, setResults] = useState<ResultRows>({});
  const [error, setError] = useState("");
  const clientId = useRef("");

  useEffect(() => {
    if (stage !== "running") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/progress/${clientId.current}`);
        if (response.ok) setProgress(await response.json());
      } catch {
        setProgress((current) => ({ ...current, message: "Keeping the connection alive..." }));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  async function runWorkflow() {
    clientId.current = crypto.randomUUID();
    setStage("running");
    setError("");
    setResults({});
    setProgress({ progress: 5, message: "Preparing Franceska..." });
    try {
      const response = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId.current, sheet_url: sheetUrl, pipeline_url: pipelineUrl }),
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== "success") throw new Error(payload.message ?? "The workflow could not complete.");
      setResults(payload.data ?? {});
      setProgress({ progress: 100, message: "All sessions completed successfully" });
      setStage("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The workflow could not complete.");
      setStage("error");
    }
  }

  function reset() {
    setStage("setup");
    setProgress({ progress: 0, message: "Ready for a Franceska run" });
    setResults({});
    setError("");
  }

  const sessionNames = Object.keys(results);
  const statusLabel = stage === "setup" ? "Ready" : stage === "running" ? "Running" : stage === "success" ? "Complete" : "Attention";

  return (
    <main className="reference-shell">
      <div className="reference-grid" />
      <div className="reference-glow" />
      <section className="reference-content">
        <header className="reference-header">
          <div className="reference-brand"><span className="reference-brand-mark"><Sparkles size={15} /></span><div><strong>Franceska <b>Workflow</b></strong><small>Google Sheets data assistant</small></div></div>
          <div className="online-pill"><span className="pulse-dot" /> API online <span>:8010</span></div>
        </header>

        <div className="reference-main">
          <div className="reference-copy">
            <p className="reference-kicker">Data cleaning workspace</p>
            <h1>Clean once.<br /><span>Sync clearly.</span></h1>
            <p className="reference-description">Run the SG and MY data sessions through GNS Data Cleaner, then write clean records back to their target sheets.</p>
            <div className="reference-tags"><span>Google Sheets</span><span>SG + MY sessions</span><span>Live progress</span></div>
          </div>

          <div className="workflow-card"><div className="workflow-card-inner">
            <div className="workflow-titlebar"><div className="workflow-title"><span className="workflow-icon"><Settings2 size={18} /></span><div><h2>Franceska run room</h2><p>{stage === "setup" ? "Configure your data workflow" : stage === "success" ? "Workspace delivery complete" : progress.message}</p></div></div><span className={`stage-pill ${stage}`}>{statusLabel}</span></div>
            {stage === "setup" && <div className="setup-state"><label>Source spreadsheet URL<input value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} /></label><label>Cleaner pipeline URL<input value={pipelineUrl} onChange={(event) => setPipelineUrl(event.target.value)} /></label><div className="workflow-note"><Database size={17} /><div><strong>Two sessions queued</strong><small>SG2 -&gt; SG3 <i /> MY2 -&gt; MY3</small></div></div><button className="reference-action" onClick={runWorkflow} disabled={!sheetUrl || !pipelineUrl}><Play size={16} fill="currentColor" /> Run Franceska <ArrowRight size={17} /></button></div>}
            {stage === "running" && <div className="running-state"><div className="running-orbit"><LoaderCircle size={32} /></div><h3>Working through your sessions</h3><div className="reference-progress"><div style={{ width: `${progress.progress}%` }} /></div><p>{progress.progress}% <span>-</span> {progress.message}</p></div>}
            {stage === "error" && <div className="error-state"><CircleAlert size={29} /><h3>Workflow stopped</h3><p>{error}</p><button className="reference-secondary" onClick={reset}><RotateCcw size={15} /> Try again</button></div>}
            {stage === "success" && <div className="success-state"><div className="success-icon"><Check size={25} /></div><h3>Workspace updated</h3><p>Clean records were written to the target worksheets.</p><div className="result-summary">{sessionNames.map((name) => <span key={name}><b>{name}</b> {results[name].length} rows</span>)}</div><button className="reference-secondary" onClick={reset}><RotateCcw size={15} /> Start a new run</button></div>}
          </div></div>
        </div>

        <footer className="reference-footer"><span>Private Franceska workflow</span><span>Sheets - Cleaner - Sessions</span></footer>
      </section>
    </main>
  );
}
