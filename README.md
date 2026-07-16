# 🏛️ PickrCourt — Preference Ranking Court

[![Deployed on Studionet](https://img.shields.io/badge/GenLayer-Studionet_61999-blue)](https://studio.genlayer.com)

**Contract:** `0x5A8a47F42D2f39cF4C42234FBF24B33428A30Dc7`
**Network:** GenLayer Studionet (Chain 61999)

> Preference ranking court — AI jury ranks options with confidence scores

## 🎬 Walkthrough Video

▶️ **[Play walkthrough video](videos/walkthrough.mp4)** — watch the full E2E flow:
form fill → submit → AI jury deliberation → on-chain consensus → verdict

*Also available:* [Download MP4](videos/walkthrough.mp4)

## 📸 Verdict Preview

The AI jury produces: **Ranked top option with confidence scores**

## 🏗️ Architecture

```
┌─────────────────┐    submit    ┌──────────────────┐
│  Vite + React   │─────────────▶│  GenLayer        │
│  Frontend       │              │  Intelligent     │
│  (TypeScript)   │              │  Contract        │
│                 │◀─────────────│  (Python)        │
│  Display        │    verdict   │                  │
│  verdict modal  │              │  LLM jury →      │
└─────────────────┘              │  consensus       │
                                 └──────────────────┘
```

1. **User** fills the form and clicks submit
2. **Frontend** sends the payload to the intelligent contract on-chain
3. **Contract** fans out to a panel of LLM agents (jury)
4. **LLM jury** deliberates and returns a verdict with reasoning
5. **GenLayer consensus** finalizes the verdict on-chain (~90-150s)
6. **Frontend** polls and displays the verdict

## 📁 Structure

```
pickrcourt/
├── contracts/          # Python intelligent contract
│   └── pickrcourt.py
├── frontend/           # Vite + React + TypeScript
│   ├── src/
│   │   ├── App.tsx         # Main UI component
│   │   ├── main.tsx        # Entry point
│   │   ├── services/
│   │   │   └── contract.ts # Contract interaction (read/write)
│   │   └── components/     # UI components
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── tests/
│   └── test_contract.py # Contract unit tests
├── .contract_addr      # Deployed contract address
├── selfcheck.py        # Self-test script
└── videos/
    └── walkthrough.mp4 # Live E2E walkthrough video
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- `genlayer` CLI (`pip install genlayer`)

### Run locally

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Deploy to Studionet

```bash
genlayer deploy contracts/pickrcourt.py --rpc https://studio.genlayer.com/api
```

### Verify contract on-chain

```bash
genlayer call 0x5A8a47F42D2f39cF4C42234FBF24B33428A30Dc7 get_stats --rpc https://studio.genlayer.com/api
```

## 🧪 Testing

```bash
# Contract unit tests
cd tests && python -m pytest

# Self-check (requires deployer key)
python selfcheck.py
```

## 🎥 Video Recording

The walkthrough video was recorded using:

- **`agent-browser record start/stop`** — native Chromium video capture via Chrome DevTools Protocol
- **`ffmpeg`** — compressed to MP4 (libx264, CRF 28) for portability

```bash
# Record your own walkthrough
agent-browser record start walkthrough.webm http://localhost:5173
# ... interact with the app ...
agent-browser record stop
ffmpeg -i walkthrough.webm -c:v libx264 -crf 28 videos/walkthrough.mp4
```

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Smart contract | Python (GenLayer Intelligent Contracts) |
| Consensus | GenLayer Optimistic Democracy (LLM jury) |
| Frontend | React 18 + TypeScript + Vite |
| State | React hooks |
| Deployment | GenLayer Studionet (Chain 61999) |
| Recording | agent-browser (Chrome DevTools Protocol) |

## 📜 Part of GenLayer dApp Collection

This dApp is part of a collection of 8 GenLayer intelligent contract dApps.
See the other projects:

| dApp | Description | Contract |
|---|---|---|
| [DebateCourt](https://github.com/tommycet/genlayer-debatecourt) | AI debate arbitrator | `0x1615…B9A` |
| [ClauseGuard](https://github.com/tommycet/genlayer-clauseguard) | Legal clause risk scanner | `0xdCc0…229` |
| [PickrCourt](https://github.com/tommycet/genlayer-pickrcourt) | Preference ranking court | `0x5A8a…bDc7` |
| [RepuScan](https://github.com/tommycet/genlayer-repuscan) | Trust signal scanner | `0x82e7…1aC2` |
| [BioLens](https://github.com/tommycet/genlayer-biolens) | Scientific claim analyzer | `0x7CFa…280A` |
| [SentOracle](https://github.com/tommycet/genlayer-sentioracle) | Sentiment oracle | `0xB099…55cf` |
| [CodeCourt](https://github.com/tommycet/genlayer-codecourt) | Code review court | `0xA218…78cA` |
| [NomNomLens](https://github.com/tommycet/genlayer-nomnomlens) | Nutrition verdict | `0x29e1…75a5` |

## 📜 License

MIT — open source for the GenLayer community.
