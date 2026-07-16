# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone
import json

@allow_storage
@dataclass
class Result:
    id: u256
    input: str
    verdict: str
    submitter: str
    timestamp: str

class PickrCourt(gl.Contract):
    counter: u256
    results: TreeMap[u256, Result]

    def __init__(self):
        self.counter = u256(0)

    DOMAIN_TITLE = "PickrCourt"
    DOMAIN_PROMPT = """You are a decision advisor. Given decision criteria and a list of options, pick the best one.
Return STRICT JSON: {"winner":"<the chosen option>","ranking":["option","option"],"reasoning":"1-2 sentences why the winner fits the criteria"}.
Rank ALL options best-to-worst; be decisive."""
    DOMAIN_DIMENSIONS = ["winner", "ranking", "reasoning"]

    def _build_prompt(self, inp: str, content: str) -> str:
        web = ("\n\nWEB CONTENT:\n" + content[:8000]) if content else ""
        return self.DOMAIN_PROMPT + "\n\nINPUT:\n" + inp + web

    def _parse(self, raw: str) -> str:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            cleaned = parts[1][4:] if parts[1].startswith("json") else parts[1]
            cleaned = cleaned.strip()
        if not cleaned.startswith("{"):
            s, e = cleaned.find("{"), cleaned.rfind("}")
            if s != -1 and e != -1:
                cleaned = cleaned[s:e+1]
        try:
            data = json.loads(cleaned)
        except Exception:
            data = {"raw": raw[:2000], "parse_error": True}
        return json.dumps(data)

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({"total": int(self.counter), "title": self.DOMAIN_TITLE})

    @gl.public.view
    def get_recent(self, limit: u256, offset: u256) -> str:
        out = []
        start = int(offset)
        end = min(start + int(limit), int(self.counter))
        for i in range(start, end):
            rid = u256(int(self.counter) - i)
            r = self.results.get(rid)
            if r is not None:
                out.append({"id": int(rid), "input": str(r.input)[:200], "verdict": r.verdict, "submitter": r.submitter, "timestamp": r.timestamp})
        return json.dumps(out)

    @gl.public.view
    def get_result(self, rid: u256) -> str:
        r = self.results.get(rid)
        if r is None:
            return json.dumps({"error": "not found"})
        return json.dumps({"id": int(rid), "input": r.input, "verdict": r.verdict, "submitter": r.submitter, "timestamp": r.timestamp})

    @gl.public.write
    def submit(self, payload: str):
        try:
            if isinstance(payload, str):
                data = json.loads(payload)
            else:
                data = payload
            if isinstance(data, dict):
                inp = data.get("input", payload)
            else:
                inp = payload
        except Exception:
            inp = payload
        inp = str(inp)
        content = ""
        if isinstance(inp, str) and inp.startswith("http"):
            try:
                content = str(gl.nondet.web.render(inp, mode="text"))
            except Exception:
                content = ""
        def evaluate():
            return gl.nondet.exec_prompt(self._build_prompt(inp, content))
        raw = gl.eq_principle.prompt_non_comparative(
            evaluate,
            task="Evaluate input for " + self.DOMAIN_TITLE,
            criteria="Return strict JSON matching the domain schema",
        )
        verdict = self._parse(raw)
        self.counter = u256(int(self.counter) + 1)
        rid = self.counter
        self.results[rid] = Result(
            id=rid,
            input=str(inp)[:4000],
            verdict=str(verdict)[:4000],
            submitter=str(gl.message.sender_address),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
