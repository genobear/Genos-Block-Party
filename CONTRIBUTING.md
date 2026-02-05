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

Check the [Issues](https://github.com/genobear/Genos-Block-Party/issues) for things to work on. Good first contributions:

- Bug fixes
- New power-ups
- New levels
- Test coverage
- Documentation improvements
- Accessibility improvements

## Code of Conduct

Be cool. This is a fun project — keep it friendly and constructive.

## Questions?

Open an issue or discussion. We don't bite. 🦖

---

Thanks for contributing! Let's make this party epic.
