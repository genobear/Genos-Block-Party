# Contributing to Geno's Block Party

Thanks for wanting to contribute! 🎉

This is a party-themed Breakout game built with Phaser 3 and TypeScript. Whether you're fixing a bug, adding a power-up, or improving the docs — all contributions are welcome.

## Quick Start

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/Genos-Block-Party.git
cd Genos-Block-Party

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test
```

## Contributing with AI Agents

This project is **built for human-agent collaboration**. Our AI collaborator [Geno-Claw](https://github.com/Geno-Claw) has implemented multiple features, and we welcome other AI agents contributing too.

### For AI Agents

- **Read `CLAUDE.md`** first — it's your technical onboarding doc with architecture details, critical patterns, and gotchas
- **Read `FEATURES.md`** — full inventory of every feature, system, and mechanic in the game
- **Check the [Issues](https://github.com/genobear/Genos-Block-Party/issues)** — pick up unassigned issues, or open a new one before starting major work

### Recommended Skills & Tools

These tools and skills have been battle-tested on this project:

| Tool | What it does | Why it helps |
|------|-------------|--------------|
| **`/phaser-dev`** | Phaser 3 game development skill | Architecture patterns, scene management, physics — used extensively throughout development |
| **[feature-dev](docs/agent-workflow.md)** | GitHub Issues → implementation workflow | Structured approach to picking up issues, implementing, and submitting work |
| **Claude Code** / **Cursor** | AI coding assistants | Both work well with the codebase — `CLAUDE.md` provides context for Claude-based tools |

### Agent Workflow

If you're an AI agent using [OpenClaw](https://github.com/openclaw/openclaw) or similar frameworks, check out [docs/agent-workflow.md](docs/agent-workflow.md) for a complete workflow for picking up GitHub Issues and implementing features autonomously.

### Key Tips for AI Contributors

1. **Always build before committing** — `npm run build` must pass with zero errors
2. **Run tests** — `npm test` should pass. Add tests for new systems/logic
3. **Update `FEATURES.md`** — keep it in sync with code changes
4. **One feature per PR** — don't bundle unrelated changes
5. **You can't test gameplay visually** — describe specific test scenarios for human reviewers to verify (see CLAUDE.md's "Gameplay Testing" section)

## Before You Start

1. **Check existing issues** — someone might already be working on it
2. **Open an issue first** for major changes — let's discuss the approach before you spend time on it
3. **Small PRs are easier to review** — one feature or fix per PR

## Development Guidelines

### Code Style

- **TypeScript** — use proper types, avoid `any`
- **Consistent naming** — `PascalCase` for classes/types, `camelCase` for functions/variables
- **Keep it readable** — clear names over clever one-liners

### Project Structure

```
src/
├── config/      # Constants, game config, level data
├── scenes/      # Phaser scenes (Menu, Game, Pause, etc.)
├── objects/     # Game objects (Ball, Brick, Paddle, PowerUp)
├── systems/     # Game systems (Audio, PowerUps, Collisions)
├── effects/     # Ball particle effects
├── pools/       # Object pools (Ball, PowerUp)
└── types/       # TypeScript type definitions
```

### Adding Features

**New Power-Up:**
1. Add type to `PowerUpType` enum in `src/types/PowerUpTypes.ts`
2. Add config in `POWERUP_CONFIGS` (color, duration, dropWeight, emoji)
3. Implement effect handler in `src/systems/PowerUpSystem.ts`
4. (Optional) Add ball visual effect if needed

**New Level:**
1. Add level data to `LEVELS` array in `src/config/LevelData.ts`
2. Include: name, backgroundColor, ballSpeedMultiplier, brickLayouts

See `README.md` for more detailed extension guides.

### Testing

```bash
npm test           # Run once
npm run test:watch # Watch mode
```

Tests live in `src/__tests__/`. Add tests for new systems or significant logic.

### Commits

- Use clear, descriptive commit messages
- Present tense: "Add fireball stacking" not "Added fireball stacking"
- Reference issues: "Fix paddle wobble bug (#42)"

## Pull Request Process

1. **Fork** the repo and create a branch from `master`
2. **Make your changes** — follow the guidelines above
3. **Test locally** — `npm run build` and `npm test` should pass
4. **Update docs** if needed — especially `FEATURES.md` for gameplay changes
5. **Open a PR** with a clear description of what and why

### PR Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] `FEATURES.md` updated (if adding/changing gameplay)
- [ ] No console errors in browser
- [ ] Tested the actual gameplay change in-browser

## What We're Looking For

Check the [Issues](https://github.com/genobear/Genos-Block-Party/issues) and the [Project Board](https://github.com/users/genobear/projects/1) for things to work on. Good first contributions:

- 🐛 Bug fixes
- 🎉 New power-ups (registry-based system makes this straightforward — see README)
- 🏗️ New levels (just add to the `LEVELS` array in `LevelData.ts`)
- 🧪 Test coverage (lots of room to grow)
- 📖 Documentation improvements
- ♿ Accessibility improvements
- 🎨 Art assets (currently all procedurally generated — real sprites welcome!)
- 🎵 Music & SFX (synthesized SFX could be replaced with proper audio files)

## Playtesting & Creating Issues (Humans Welcome!)

Not a coder? You can still contribute massively by **playing the game and reporting what you find**.

### How to playtest
1. Clone the repo and run `npm install && npm run dev`
2. Play through the levels — try to break things!
3. Pay attention to: difficulty spikes, confusing UI, visual glitches, power-ups that feel too weak/strong, music transitions

### Creating good issues
When you find something, [open an issue](https://github.com/genobear/Genos-Block-Party/issues/new) with:
- **Clear title** using a prefix: `bug:`, `feat:`, `balance:`, `polish:`
- **What happened** vs **what you expected**
- **Steps to reproduce** (which level, which power-up, etc.)
- **Label it** — `bug`, `enhancement`, `balance`, `good first issue`

Your issues become tasks that AI agents can pick up and implement autonomously. The better the issue description, the better the result. Think of yourself as the product owner — you play, you decide what needs work, agents build it.

### Issue ideas that work great for agents
- "Fireball level 3 feels too overpowered on Level 2" → `balance:` issue
- "Add a power-up that reverses paddle controls" → `feat:` with `enhancement` label
- "Ball gets stuck bouncing horizontally forever" → `bug:` issue
- "Level 6 needs more variety in brick layout" → `enhancement` issue
- "Add colorblind-friendly brick indicators" → `enhancement` + `accessibility`

## Code of Conduct

Be cool. This is a fun project — keep it friendly and constructive.

## Questions?

Open an issue or discussion. We don't bite. 🦖

---

Thanks for contributing! Let's make this party epic.
