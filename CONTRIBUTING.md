# Contributing to ALLS

Thank you for your interest in contributing to the Autonomous Lunar Logistics System!

## 🎯 Project Philosophy

This is an **educational project**. Contributions should prioritize:

1. **Clarity over cleverness** — Code should teach, not impress
2. **Documentation** — Every feature needs explanation
3. **Safety concepts** — Demonstrate why constraints matter
4. **Accessibility** — Lower barriers for learners

## 📋 Before Contributing

### Read the Constitution

The [SPEC-KIT.md](SPEC-KIT.md) contains our **Project Constitution** (Section 12). Key rules:

- **Segment Sovereignty** — Don't cross workspace boundaries
- **Contract Fidelity** — Use only defined schemas
- **Safety First** — Never bypass safety checks, even in demos

### Understand the Architecture

```
OAS (C++/WASM)  ←→  shared-contracts  ←→  GSC (Python)
                          ↓
                    MCWI (React/TS)
```

Each segment is independent. Cross-segment changes require RFC approval.

## 🚀 Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/reversesingularity/autonomous-lunar-logistics.git
cd autonomous-lunar-logistics
```

### 2. Choose Your Segment

| Segment | Skills Needed | Start Here |
|---------|--------------|------------|
| **OAS** | C++, systems programming | `oas/README.md` |
| **GSC** | Python, ML/RL | `gsc/README.md` |
| **MCWI** | React, TypeScript | `mcwi/README.md` |
| **Docs** | Technical writing | `docs/README.md` |

### 3. Set Up Development Environment

```bash
# MCWI (Web Interface)
cd mcwi && npm install

# GSC (Simulation)
cd gsc && pip install -r requirements.txt

# OAS (Onboard - requires Emscripten for WASM)
cd oas && ./setup.sh
```

## 📝 Contribution Types

### 🐛 Bug Fixes

1. Check existing issues first
2. Create a minimal reproduction
3. Submit PR with test case

### ✨ Features

1. **Check SPEC-KIT.md** — Is this feature already specified?
2. **Open an issue first** — Discuss before implementing
3. **Stay in your segment** — Don't cross boundaries
4. **Add documentation** — Features without docs won't be merged

### 📚 Documentation

Always welcome! Focus on:

- Tutorials for beginners
- Concept explanations
- Architecture diagrams
- Code comments

### 🧪 Tests

We need more tests! Especially:

- Edge cases in physics simulation
- Multi-agent coordination scenarios
- UI accessibility testing

## 🔄 Pull Request Process

### 1. Branch Naming

```
feature/mcwi-fleet-visualization
bugfix/gsc-training-loop
docs/tutorial-getting-started
```

### 2. Commit Messages

```
[SEGMENT] Brief description

- Detail 1
- Detail 2

Refs: #123
```

Example:
```
[MCWI] Add fleet status aggregation component

- Implements F-001 from SPEC-KIT
- Groups ships by mission phase
- Adds color-coded status indicators

Refs: #42
```

### 3. PR Checklist

- [ ] Follows segment boundaries (no cross-imports)
- [ ] Uses only schemas from `shared-contracts/`
- [ ] Includes tests
- [ ] Updates documentation
- [ ] Passes CI checks
- [ ] Links to relevant issue

### 4. Review Process

1. Automated checks must pass
2. One maintainer review required
3. Documentation review for new features
4. Integration test for cross-segment changes

## 🚫 What We Don't Accept

- Code that crosses segment boundaries
- "Production optimizations" that bypass safety checks
- Dependencies not in the approved tech stack
- Features not in SPEC-KIT without prior RFC
- Code without comments or documentation

## 💬 Communication

- **Issues** — Bug reports, feature requests
- **Discussions** — Questions, ideas, RFC proposals
- **Pull Requests** — Code contributions

## 📜 Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

**TL;DR:** Be kind, be patient, remember we're all learning.

## 🏆 Recognition

Contributors are recognized in:

- README.md acknowledgments
- CITATION.cff (for significant contributions)
- Release notes

## ❓ Questions?

Open a Discussion or reach out to maintainers.

---

*Thank you for helping make space exploration education accessible to everyone!* 🚀
