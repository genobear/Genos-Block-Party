# Agent Workflow — Contributing with AI

This document describes a structured workflow for AI agents (or AI-assisted developers) to pick up GitHub Issues and implement features for Geno's Block Party.

This workflow was developed by [Geno-Claw](https://github.com/Geno-Claw), an AI collaborator on this project, using [OpenClaw](https://github.com/openclaw/openclaw). It works with any AI coding tool — Claude Code, Cursor, Copilot, Windsurf, or similar.

---

## Overview

The basic loop:

1. **Find an issue** → Check [GitHub Issues](https://github.com/genobear/Genos-Block-Party/issues) for unassigned work
2. **Understand the codebase** → Read `CLAUDE.md` (architecture), `FEATURES.md` (feature inventory), and relevant source files
3. **Plan before building** → Comment your approach on the issue
4. **Implement** → Write code, tests, update docs
5. **Verify** → `npm run build` + `npm test` must pass
6. **Submit** → Open a PR with clear description

---

## Step 1: Pick Up an Issue

```bash
# List open issues
gh issue list --repo genobear/Genos-Block-Party --state open

# Check the project board for prioritized work
# https://github.com/users/genobear/projects/1
```

**Priority order:**
- `priority:high` labeled issues first
- Then oldest unassigned issues
- Skip issues assigned to someone else
- `needs-discussion` issues need human input first — comment and move on

**Before starting major work**, open an issue first if one doesn't exist. This prevents duplicate effort and lets maintainers weigh in on the approach.

---

## Step 2: Read Before You Build

**Required reading before any implementation:**

| File | Why |
|------|-----|
| `CLAUDE.md` | Architecture overview, critical patterns, gotchas |
| `FEATURES.md` | Complete feature inventory — know what already exists |
| `docs/PROJECT-PLAN.md` | Project roadmap and phase status |
| The issue + all comments | Requirements, discussion, feedback |

**Key architecture patterns to understand:**
- Scene communication via Phaser events (`this.events.emit()` / `.on()`)
- Singleton systems (AudioManager, TransitionManager, BallSpeedManager)
- Object pooling (BallPool, PowerUpPool) — avoid GC stutters
- `Constants.ts` for all tunable values — don't hardcode magic numbers

---

## Step 3: Plan Your Approach

Comment on the issue with your implementation plan before writing code. Include:

- Which files you'll modify/create
- Your approach to the problem
- Any questions or tradeoffs

This prevents wasted work and gives maintainers a chance to course-correct early.

---

## Step 4: Implement

### Branch Strategy

```bash
# Fork the repo (if you haven't already)
# Create a feature branch from master
git checkout master
git pull origin master
git checkout -b feat/your-feature-name
```

### Coding Guidelines

- **TypeScript** — proper types, avoid `any`
- **Follow existing patterns** — look at how similar features are implemented
- **`Constants.ts`** — all tunable values go here, not inline
- **Tests** — add tests for new systems or significant logic (see `src/__tests__/`)
- **Update `FEATURES.md`** — document what you added/changed

### Common Extension Points

**Adding a power-up** (most common contribution):
1. Add type to `PowerUpType` enum (`src/types/PowerUpTypes.ts`)
2. Add config in `POWERUP_CONFIGS` (color, duration, dropWeight, emoji)
3. Implement effect handler in `src/systems/PowerUpSystem.ts`
4. (Optional) Add ball visual effect in `src/effects/handlers/`

**Adding a level:**
1. Add level data to `LEVELS` array in `src/config/LevelData.ts`
2. Include: name, backgroundColor, ballSpeedMultiplier, brickLayouts

**Adding tests:**
1. Create test file in `src/__tests__/` following existing patterns
2. Use Vitest (`describe`, `it`, `expect`)
3. Mock browser APIs if needed (see test setup file)

### Recommended AI Skills

If your AI tool supports skills/plugins:

| Skill | Use for |
|-------|---------|
| `/phaser-dev` | Phaser 3 patterns, physics, scene management |
| `/frontend-design` | UI scenes, menus, visual design |

---

## Step 5: Verify

Before submitting, **everything must pass**:

```bash
# Build must succeed with zero errors
npm run build

# All tests must pass
npm test

# Check for TypeScript errors
npx tsc --noEmit
```

**You cannot test gameplay visually.** Instead:
- Write specific test scenarios for human reviewers
- Include console commands to help test (see Debug Tools in CLAUDE.md)
- Example: "Test by spawning the power-up with `GameDebug.spawnPowerUp('yourpowerup')` and verify X happens"

---

## Step 6: Submit a PR

### Commit Format

Use conventional commits with issue references:

```
<type>: <short description> (#<issue-number>)
```

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `test` | Tests |
| `refactor` | Code restructuring |
| `chore` | Maintenance, deps |

Examples:
- `feat: add laser beam power-up (#42)`
- `fix: ball stuck in horizontal loop (#38)`
- `test: add electric ball AOE tests (#45)`

### PR Description

Include:
- What the change does
- How to test it (specific gameplay scenarios)
- Screenshots/GIFs if relevant
- Any known limitations

### PR Checklist

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `FEATURES.md` updated (if gameplay change)
- [ ] No `console.log` left in code
- [ ] Tested in-browser (or provided detailed test instructions)

---

## Tips for AI Agents

1. **Don't guess — read.** The codebase is well-documented. Check `FEATURES.md` before assuming something doesn't exist.
2. **One feature per PR.** Don't bundle unrelated changes.
3. **Build verification is non-negotiable.** If it doesn't build, it doesn't ship.
4. **Follow the patterns.** Look at how existing power-ups, levels, or systems are implemented and match the style.
5. **Ask when stuck.** Open a discussion or comment on the issue rather than guessing at requirements.

---

## Architecture Decision Records

For significant design decisions, document them in `docs/adr/`:

```markdown
# ADR-NNNN: Title

**Date:** YYYY-MM-DD
**Status:** Accepted

## Context
What decision needed to be made?

## Decision
What was decided and why?

## Consequences
Trade-offs and implications.
```

---

## For Humans: Playtest → Create Issues → Let Agents Build

The best human-agent collaboration loop:

1. **You play the game** — find bugs, spot balance issues, dream up features
2. **You write an issue** — clear title, reproduction steps, expected behavior
3. **An agent picks it up** — reads the issue, plans, implements, submits a PR
4. **You review and test** — play the result, give feedback, merge or request changes

### Writing agent-friendly issues

Agents work best with **specific, well-scoped issues**. A few tips:

- **One thing per issue** — "Fix X" is better than "Fix X, Y, and also add Z"
- **Include context** — which level, which power-up, what you were doing when it happened
- **Describe the desired outcome** — "The ball should bounce off at a steeper angle" beats "ball physics feel weird"
- **Label appropriately** — `bug`, `enhancement`, `balance`, `good first issue`, `priority:high`
- **Add screenshots or recordings** if relevant — agents can't play the game, so visual context helps

The better the issue, the better the agent's implementation. You're the product owner; agents are the dev team.

---

*This workflow is open source. Feel free to adapt it for your own projects.*
