import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  CONTRACT_ADDRESS,
  IS_DEPLOYED,
  getRecent,
  getStats,
  submit,
  waitForNewResult,
} from "./services/contract";

type Status = "idle" | "signing" | "broadcast" | "consensus" | "done" | "error";
type RecentRanking = { id: number | string; input: string; verdict: unknown };
type ParsedInput = { question: string; options: string[] };
type OptionResult = { name: string; rank: number; score: number; reasoning: string };

const DEFAULT_OPTIONS = ["Neon Labs", "Orbit Studio", "Signal Forge"];
const STATUS_COPY: Record<Status, string> = {
  idle: "Ready for the jury",
  signing: "Signing verdict request…",
  broadcast: "Broadcasting to Studionet…",
  consensus: "AI jury deliberating…",
  done: "Verdict revealed",
  error: "Needs attention",
};

export default function App() {
  const [stats, setStats] = useState<{ total: number; title: string }>({ total: 0, title: "" });
  const [recent, setRecent] = useState<RecentRanking[]>([]);
  const [question, setQuestion] = useState("Which option deserves the spotlight?");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [status, setStatus] = useState<Status>("idle");
  const [selected, setSelected] = useState<RecentRanking | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [nextStats, nextRecent] = await Promise.all([getStats(), getRecent(8, 0)]);
      setStats(nextStats);
      setRecent(nextRecent as RecentRanking[]);
    } catch (e: any) {
      console.warn("refresh failed", e?.message);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit() {
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (!IS_DEPLOYED) {
      setError("Contract not deployed yet — set CONTRACT_ADDRESS in services/contract.ts");
      setStatus("error");
      return;
    }
    if (!question.trim() || cleanOptions.length < 2) {
      setError("Add a question and at least two options.");
      setStatus("error");
      return;
    }

    setError("");
    setStatus("signing");
    const before = stats.total;
    try {
      await submit({ input: JSON.stringify({ criteria: question.trim(), options: cleanOptions }) });
      setStatus("broadcast");
      setStatus("consensus");
      await waitForNewResult(before);
      const latest = (await getRecent(1, 0)) as RecentRanking[];
      setSelected(latest[0] ?? null);
      setStatus("done");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "submit failed");
      setStatus("error");
    }
  }

  const activeOptions = options.map((option) => option.trim()).filter(Boolean);
  const selectedInput = selected ? parseInput(selected.input) : { question, options: activeOptions };
  const selectedResults = selected ? parseVerdict(selected.verdict, selectedInput.options) : [];
  const heroResults = selectedResults.length ? selectedResults : previewResults(activeOptions);

  return (
    <main className="app-shell">
      <div className="ambient" aria-hidden="true" />
      <header className="topbar" aria-label="PickrCourt status">
        <a className="brand" href="#composer" aria-label="PickrCourt home">
          <span className="brand-mark">PC</span>
          <span>
            <strong>PickrCourt</strong>
            <em>Talent Showcase</em>
          </span>
        </a>
        <NetworkStatusPill total={stats.total} status={status} />
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">GenLayer AI jury · Studionet 61999</p>
          <h1>Put every option on stage. Let the jury crown the winner.</h1>
          <p className="hero-lede">
            Compose a decision, send it on-chain, then watch ranked contenders race into place with
            transparent AI reasoning.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#composer">Create a ranking</a>
            <a className="secondary-link" href="#recent">View recent verdicts</a>
          </div>
        </div>
        <ThreeHero options={activeOptions} results={heroResults} active={status === "done" || !!selected} />
      </section>

      <section className="showcase-grid" id="composer">
        <ChoiceComposer
          question={question}
          options={options}
          status={status}
          error={error}
          onQuestion={setQuestion}
          onOptions={setOptions}
          onSubmit={handleSubmit}
        />
        <VerdictPanel
          selected={selected}
          fallbackQuestion={question}
          fallbackOptions={activeOptions}
          results={heroResults}
          status={status}
          onClose={() => setSelected(null)}
        />
      </section>

      <RecentRankingsFeed recent={recent} selectedId={selected?.id} onSelect={setSelected} />
    </main>
  );
}

function ThreeHero({ options, results, active }: { options: string[]; results: OptionResult[]; active: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ options, results, active });

  useEffect(() => {
    stateRef.current = { options, results, active };
  }, [options, results, active]);

  useEffect(() => {
    const mount = mountRef.current;
    const labels = labelsRef.current;
    if (!mount || !labels) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 2.2, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const cyan = new THREE.PointLight(0x39f4ff, 18, 18);
    cyan.position.set(-3, 3, 4);
    scene.add(cyan);
    const magenta = new THREE.PointLight(0xff4fd8, 18, 18);
    magenta.position.set(3, 2, 4);
    scene.add(magenta);

    const podiums = [0.95, 0.65, 0.42].map((height, index) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.82 - index * 0.08, 0.98 - index * 0.08, height, 6),
        new THREE.MeshStandardMaterial({
          color: index === 0 ? 0xff4fd8 : index === 1 ? 0x39f4ff : 0x9b7cff,
          emissive: index === 0 ? 0x4a103d : 0x06333a,
          metalness: 0.4,
          roughness: 0.28,
        }),
      );
      mesh.position.set((index - 1) * 1.55, -1.5 + height / 2, 0);
      group.add(mesh);
      return mesh;
    });

    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0x8ff7ff, size: 0.045, transparent: true, opacity: 0.75 }),
    );
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i += 1) {
      const radius = 2 + Math.random() * 2.8;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -1 + Math.random() * 3.6;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    particles.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    scene.add(particles);

    const tileMaterial = new THREE.MeshStandardMaterial({
      color: 0x171228,
      emissive: 0x22051e,
      metalness: 0.25,
      roughness: 0.38,
    });
    const tiles = Array.from({ length: 5 }, (_, index) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.58, 0.12), tileMaterial.clone());
      group.add(mesh);
      const label = document.createElement("span");
      label.className = "scene-label";
      labels.appendChild(label);
      return { mesh, label, phase: (index / 5) * Math.PI * 2 };
    });

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(1.04, 0.025, 12, 80),
      new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0 }),
    );
    glow.rotation.x = Math.PI / 2;
    scene.add(glow);

    let frame = 0;
    let animationId = 0;
    const clock = new THREE.Clock();

    function resize() {
      const width = mount.clientWidth || 640;
      const height = mount.clientHeight || 440;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function projectLabel(mesh: THREE.Object3D, label: HTMLSpanElement) {
      const vector = mesh.position.clone().project(camera);
      label.style.transform = `translate3d(${(vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth}px, ${(-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight}px, 0) translate(-50%, -50%)`;
      label.style.opacity = String(vector.z < 1 ? 1 : 0);
    }

    function animate() {
      const elapsed = clock.getElapsedTime();
      const { options: liveOptions, results: liveResults, active: liveActive } = stateRef.current;
      const names = liveResults.length ? liveResults.map((result) => result.name) : liveOptions;
      const winner = liveResults[0]?.name ?? names[0] ?? "Top pick";
      frame += liveActive ? 0.025 : 0.01;

      tiles.forEach(({ mesh, label, phase }, index) => {
        const name = names[index % Math.max(names.length, 1)] ?? `Option ${index + 1}`;
        const isWinner = name === winner;
        const rank = liveResults.find((result) => result.name === name)?.rank ?? index + 1;
        const angle = elapsed * 0.45 + phase;
        const orbit = 2.55 + (index % 2) * 0.35;
        const targetX = liveActive && rank <= 3 ? (rank - 2) * 1.55 : Math.cos(angle) * orbit;
        const targetY = liveActive && isWinner ? 0.12 : Math.sin(angle * 1.4) * 0.42 + 0.55;
        const targetZ = liveActive && rank <= 3 ? 0.1 : Math.sin(angle) * 1.1;
        mesh.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.06);
        mesh.rotation.set(0.18 * Math.sin(angle), -0.32 * Math.cos(angle), 0.04 * Math.sin(angle * 2));
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(isWinner && liveActive ? 0x7a145f : 0x18081c);
        label.textContent = `${rank <= 3 ? `#${rank} ` : ""}${name}`;
        label.classList.toggle("is-winner", isWinner && liveActive);
        projectLabel(mesh, label);
      });

      podiums[0].scale.y = THREE.MathUtils.lerp(podiums[0].scale.y, liveActive ? 1.18 : 1, 0.05);
      particles.rotation.y += liveActive ? 0.006 : 0.002;
      glow.position.set(0, -0.95 + Math.sin(frame) * 0.08, 0);
      (glow.material as THREE.MeshBasicMaterial).opacity = liveActive ? 0.72 + Math.sin(frame * 2) * 0.18 : 0.08;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      tiles.forEach(({ mesh, label }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        label.remove();
      });
      podiums.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="stage-card" aria-label="3D talent ranking stage">
      <div ref={mountRef} className="three-stage" />
      <div ref={labelsRef} className="scene-labels" aria-hidden="true" />
      <div className="stage-caption">
        <span>Live three.js podium</span>
        <strong>{active ? "Winner lift-off" : "Orbiting contenders"}</strong>
      </div>
    </div>
  );
}

function NetworkStatusPill({ total, status }: { total: number; status: Status }) {
  const [copied, setCopied] = useState(false);
  const shortAddress = `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}`;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="network-pill">
      <span className="pulse-dot" aria-hidden="true" />
      <span>Studionet 61999</span>
      <button type="button" onClick={copyAddress} aria-label="Copy contract address">
        {copied ? "Copied" : shortAddress}
      </button>
      <strong>{total.toLocaleString()} verdicts</strong>
      <em>{STATUS_COPY[status]}</em>
    </div>
  );
}

function ChoiceComposer({
  question,
  options,
  status,
  error,
  onQuestion,
  onOptions,
  onSubmit,
}: {
  question: string;
  options: string[];
  status: Status;
  error: string;
  onQuestion: (question: string) => void;
  onOptions: (options: string[]) => void;
  onSubmit: () => void;
}) {
  const busy = status === "signing" || status === "broadcast" || status === "consensus";

  function updateOption(index: number, value: string) {
    onOptions(options.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    onOptions(options.filter((_, optionIndex) => optionIndex !== index));
  }

  return (
    <section className="panel composer-card" aria-labelledby="composer-title">
      <p className="eyebrow">Choice composer</p>
      <h2 id="composer-title">Cast the contenders</h2>
      <label className="field-label" htmlFor="question">Decision prompt</label>
      <textarea
        id="question"
        value={question}
        onChange={(event) => onQuestion(event.target.value)}
        placeholder="What should the AI jury rank?"
        rows={4}
      />
      <div className="option-head">
        <label className="field-label">Options</label>
        <button type="button" className="ghost-button" onClick={() => onOptions([...options, ""])}>
          + Add option
        </button>
      </div>
      <div className="option-list">
        {options.map((option, index) => (
          <div className="option-row" key={index}>
            <span className="option-index">{index + 1}</span>
            <input
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              placeholder={`Option ${index + 1}`}
            />
            <button type="button" onClick={() => removeOption(index)} disabled={options.length <= 2} aria-label={`Remove option ${index + 1}`}>
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="submit-button" onClick={onSubmit} disabled={busy}>
        {busy ? STATUS_COPY[status] : "Submit to AI jury"}
      </button>
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}

function VerdictPanel({
  selected,
  fallbackQuestion,
  fallbackOptions,
  results,
  status,
  onClose,
}: {
  selected: RecentRanking | null;
  fallbackQuestion: string;
  fallbackOptions: string[];
  results: OptionResult[];
  status: Status;
  onClose: () => void;
}) {
  const parsedInput = selected ? parseInput(selected.input) : { question: fallbackQuestion, options: fallbackOptions };
  const title = selected ? `Verdict #${selected.id}` : "Preview ranking";

  return (
    <section className="panel verdict-card" aria-labelledby="verdict-title">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Rank reveal</p>
          <h2 id="verdict-title">{title}</h2>
        </div>
        {selected && <button type="button" className="ghost-button" onClick={onClose}>Close</button>}
      </div>
      <p className="verdict-question">{parsedInput.question}</p>
      <AnimatedRankedResults results={results} active={status === "done" || !!selected} />
      <ReasoningExpanders results={results} />
    </section>
  );
}

function AnimatedRankedResults({ results, active }: { results: OptionResult[]; active: boolean }) {
  const maxScore = Math.max(...results.map((result) => result.score), 1);
  return (
    <div className="rank-bars" aria-label="Ranked results">
      {results.map((result, index) => {
        const width = active ? Math.max(18, (result.score / maxScore) * 100) : 12 + index * 8;
        return (
          <article className="rank-bar" key={`${result.rank}-${result.name}`} style={{ "--rank-width": `${width}%`, "--delay": `${index * 110}ms` } as React.CSSProperties}>
            <span className="rank-number">#{result.rank}</span>
            <div className="rank-meter">
              <strong>{result.name}</strong>
              <i aria-hidden="true" />
            </div>
            <span className="rank-score">{result.score}</span>
          </article>
        );
      })}
    </div>
  );
}

function ReasoningExpanders({ results }: { results: OptionResult[] }) {
  return (
    <div className="reasoning-stack">
      {results.map((result) => (
        <details key={result.name} className="reasoning-card">
          <summary>
            <span>Why #{result.rank}</span>
            <strong>{result.name}</strong>
          </summary>
          <p>{result.reasoning}</p>
        </details>
      ))}
    </div>
  );
}

function RecentRankingsFeed({
  recent,
  selectedId,
  onSelect,
}: {
  recent: RecentRanking[];
  selectedId?: number | string;
  onSelect: (ranking: RecentRanking) => void;
}) {
  return (
    <section className="recent-section" id="recent" aria-labelledby="recent-title">
      <div className="section-head">
        <p className="eyebrow">Chain feed</p>
        <h2 id="recent-title">Recent rankings</h2>
      </div>
      <div className="recent-grid">
        {recent.map((ranking) => {
          const parsed = parseInput(ranking.input);
          const winner = parseVerdict(ranking.verdict, parsed.options)[0]?.name ?? "Open verdict";
          return (
            <button
              type="button"
              className={`recent-card${ranking.id === selectedId ? " is-selected" : ""}`}
              key={String(ranking.id)}
              onClick={() => onSelect(ranking)}
            >
              <span className="recent-id">#{ranking.id}</span>
              <strong>{parsed.question}</strong>
              <em>Winner: {winner}</em>
              <small>{parsed.options.slice(0, 3).join(" · ")}</small>
            </button>
          );
        })}
        {!recent.length && <p className="empty-feed">No verdicts yet. First spotlight is yours.</p>}
      </div>
    </section>
  );
}

function parseInput(raw: string): ParsedInput {
  try {
    const data = JSON.parse(raw);
    const nested = typeof data.input === "string" ? JSON.parse(data.input) : data;
    const options = Array.isArray(nested.options) ? nested.options.map(String).filter(Boolean) : [];
    return {
      question: String(nested.criteria || nested.question || nested.prompt || raw),
      options: options.length ? options : DEFAULT_OPTIONS,
    };
  } catch {
    return { question: raw || "Untitled decision", options: DEFAULT_OPTIONS };
  }
}

function parseVerdict(raw: unknown, fallbackOptions: string[]): OptionResult[] {
  let data = raw;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    data = raw;
  }

  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const list = firstArray(source, ["ranking", "rankings", "results", "options", "verdict"]);
  const objects = list.length ? list : fallbackOptions;
  const normalized = objects.map((entry, index) => normalizeResult(entry, index, source, fallbackOptions[index])).filter(Boolean) as OptionResult[];

  if (normalized.length) return normalized.sort((a, b) => a.rank - b.rank);

  const winner = String(source.winner || source.top_pick || fallbackOptions[0] || "Top pick");
  return previewResults(fallbackOptions.length ? fallbackOptions : [winner]);
}

function normalizeResult(entry: unknown, index: number, source: Record<string, unknown>, fallback?: string): OptionResult | null {
  if (typeof entry === "string") {
    return {
      name: entry,
      rank: index + 1,
      score: Math.max(100 - index * 14, 35),
      reasoning: findReasoning(source, entry) || "The jury ranked this option from the on-chain verdict.",
    };
  }
  if (!entry || typeof entry !== "object") return null;

  const item = entry as Record<string, unknown>;
  const name = String(item.option || item.name || item.title || item.choice || item.id || fallback || `Option ${index + 1}`);
  const rank = Number(item.rank || item.position || index + 1);
  const rawScore = Number(item.score || item.points || item.confidence || Math.max(100 - index * 14, 35));
  const reasoning = String(item.reasoning || item.reason || item.rationale || item.explanation || findReasoning(source, name) || "The jury favored this option based on the submitted criteria.");

  return { name, rank: Number.isFinite(rank) ? rank : index + 1, score: Number.isFinite(rawScore) ? rawScore : 75, reasoning };
}

function firstArray(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).items)) return (value as Record<string, unknown>).items as unknown[];
  }
  return [] as unknown[];
}

function findReasoning(source: Record<string, unknown>, name: string) {
  const reasoning = source.reasoning || source.reasons || source.explanations;
  if (!reasoning || typeof reasoning !== "object") return "";
  const value = (reasoning as Record<string, unknown>)[name];
  return value ? String(value) : "";
}

function previewResults(options: string[]): OptionResult[] {
  return (options.length ? options : DEFAULT_OPTIONS).slice(0, 5).map((name, index) => ({
    name,
    rank: index + 1,
    score: Math.max(100 - index * 13, 42),
    reasoning: index === 0
      ? "Preview leader. Submit to replace this with the AI jury’s on-chain reasoning."
      : "Preview contender. The verdict panel will show the AI rationale after consensus.",
  }));
}
