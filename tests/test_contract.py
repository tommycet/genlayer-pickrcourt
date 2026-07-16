import sys, types, json
from unittest.mock import MagicMock

def _install():
    m = types.ModuleType("genlayer")
    gl = types.ModuleType("genlayer.gl")
    class _U(int):
        def __new__(c, v): return super().__new__(c, int(v))
    for n in ("u256","u64","u32","bigint","i256"): setattr(m, n, _U)
    m.Address = str
    class _Sub:
        def __getitem__(self, k): return dict
        def __call__(self, *a, **k): return {}
    m.TreeMap = _Sub()
    m.DynArray = _Sub()
    m.Contract = type("Contract", (), {})
    m.allow_storage = lambda c: c
    m.gl = gl
    gl.Contract = m.Contract
    nd = MagicMock(); nd.web.render.return_value = "web text"
    nd.web.get.return_value = MagicMock(body=b"x")
    gl.nondet = nd
    gl.nondet.exec_prompt.return_value = '{"mock_verdict": true, "score": 80, "note": "mock LLM output"}'
    gl.message = MagicMock(); gl.message.value = 0; gl.message.sender_address = "0xTEST"
    gl.message_raw = {"datetime": "2026-07-13T00:00:00+00:00"}
    gl.eq_principle = MagicMock()
    gl.eq_principle.prompt_non_comparative.side_effect = lambda fn, **k: fn()
    gl.eq_principle.strict_eq.side_effect = lambda fn, **k: fn()
    pub = MagicMock(); pub.write = lambda f: f; pub.write.payable = lambda f: f; pub.view = lambda f: f
    gl.public = pub
    sys.modules["genlayer"] = m; sys.modules["genlayer.gl"] = gl

_install()
sys.path.insert(0, "contracts")
import pickrcourt as mod

def _inst():
    inst = mod.PickrCourt()
    inst.results = {}
    return inst

def test_submit_and_read():
    inst = _inst()
    inst.submit(json.dumps({"input": "The sky is blue"}))
    assert int(inst.counter) == 1
    stats = json.loads(inst.get_stats())
    assert stats["total"] == 1
    rec = json.loads(inst.get_recent(10, 0))
    assert len(rec) == 1
    res = json.loads(inst.get_result(1))
    assert "verdict" in res

def test_empty_chain():
    inst = _inst()
    stats = json.loads(inst.get_stats())
    assert stats["total"] == 0
