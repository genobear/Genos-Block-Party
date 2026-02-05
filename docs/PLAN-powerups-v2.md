# Power-Ups V2 Implementation Plan

> **Status**: IN_PROGRESS  
> **Created**: 2026-02-04  
> **Last Updated**: 2026-02-04

---

## Overview

Add 5 new power-ups to Geno's Block Party. Each feature is implemented in its own branch with a PR for review.

---

## Workflow

1. **Check this file** at session start (via heartbeat or manually)
2. **Find the next TODO** item
3. **Create branch**: `git checkout -b feature/powerup-<name>`
4. **Implement** the feature
5. **Test** (provide specific test instructions for Scott)
6. **Commit & Push** the branch
7. **Create PR** via `gh pr create`
8. **Mark as IN_PROGRESS** in this file, commit, push to the feature branch
9. **End session** — next session picks up from PR review or next TODO

---

## Features

### 1. 🎁 Party Favor (Extra Life)
**Status**: `TODO`  
**Branch**: `feature/powerup-party-favor`  
**PR**: —

**Description**: Drops a bonus life (+1). Rare but clutch.

**Implementation**:
- Add `PARTY_FAVOR` to `PowerUpType` enum
- Config: `color: 0xff69b4`, `duration: 0` (instant), `dropWeight: 3` (very rare), `emoji: '🎁'`
- Effect: `this.scene.events.emit('livesUpdate', ++lives)` — need to expose lives to PowerUpSystem or emit event
- Play a special SFX (maybe reuse AIRHORN or add new one)
- Celebration particles

**Test Instructions**:
- Force spawn: `GameDebug.spawnPowerUp('partyfavor', 400, 300)`
- Verify life count increases
- Verify UI updates
- Verify particles/feedback

---

### 2. 🧲 DJ Scratch (Magnet Paddle)
**Status**: `IN_PROGRESS`  
**Branch**: `feature/powerup-dj-scratch`  
**PR**: https://github.com/genobear/Genos-Block-Party/pull/2

**Description**: Ball sticks to paddle on contact. Click/tap to release with aim.

**Implementation**:
- Add `DJ_SCRATCH` to `PowerUpType` enum
- Config: `color: 0x00ffff`, `duration: 15000`, `dropWeight: 12`, `emoji: '🧲'`
- Add `isMagnetActive` state to Paddle or PowerUpSystem
- Modify ball-paddle collision: if magnet active, attach ball to paddle (like pre-launch state)
- Ball follows paddle until click releases it
- Works with multi-ball (each ball sticks on contact)

**Test Instructions**:
- Collect DJ Scratch power-up
- Let ball hit paddle — should stick
- Move paddle, ball should follow
- Click to release
- Test with multiple balls (Disco + DJ Scratch combo)

---

### 3. 💣 Party Popper (3x3 Bomb)
**Status**: `TODO`  
**Branch**: `feature/powerup-party-popper`  
**PR**: —

**Description**: Next brick hit explodes in 3x3 area. One-shot.

**Implementation**:
- Add `PARTY_POPPER` to `PowerUpType` enum
- Config: `color: 0xff4500`, `duration: 0` (until used), `dropWeight: 10`, `emoji: '💣'`
- Add `hasBomb` state to Ball
- On brick collision: if `hasBomb`, find adjacent bricks (3x3 grid), damage all, clear bomb state
- Explosion particles + screen shake
- Visual indicator on ball (pulsing glow?)

**Test Instructions**:
- Collect Party Popper
- Verify ball has visual indicator
- Hit a brick in middle of formation
- Verify 3x3 area takes damage
- Verify bomb is consumed (single use)

---

### 4. 🛡️ Bounce House (Safety Net)
**Status**: `TODO`  
**Branch**: `feature/powerup-bounce-house`  
**PR**: —

**Description**: Temporary floor that saves the ball once, then disappears.

**Implementation**:
- Add `BOUNCE_HOUSE` to `PowerUpType` enum
- Config: `color: 0x90ee90`, `duration: 0` (until used), `dropWeight: 10`, `emoji: '🛡️'`
- Create `SafetyNet` game object — horizontal bar above death zone
- Physics collider with ball group
- On collision: bounce ball, destroy net, play "boing" + pop animation
- Visual: bouncy castle style, maybe inflates on spawn, pops on use

**Test Instructions**:
- Collect Bounce House
- Verify net appears above bottom edge
- Let ball fall — should bounce off net
- Verify net disappears after one use
- Verify ball is actually saved (no life lost)

---

### 5. 🎵 Bass Drop (Screen Nuke)
**Status**: `TODO`  
**Branch**: `feature/powerup-bass-drop`  
**PR**: —

**Description**: Instant 1 damage to ALL bricks on screen.

**Implementation**:
- Add `BASS_DROP` to `PowerUpType` enum
- Config: `color: 0x9400d3`, `duration: 0` (instant), `dropWeight: 8`, `emoji: '🎵'`
- Effect: iterate all bricks, call `brick.hit()` on each
- Massive screen shake + flash
- Audio: bass drop sound (WHOOSH or new SFX)
- Particle wave effect radiating from paddle

**Test Instructions**:
- Force spawn: `GameDebug.spawnPowerUp('bassdrop', 400, 300)`
- Collect it
- Verify ALL bricks take 1 damage
- Verify 1-HP bricks are destroyed
- Verify screen shake + visual feedback

---

## Completed

_(Move features here when merged)_

---

## Notes

- Keep PRs small and focused — one power-up per PR
- Test instructions are for Scott since I can't play-test real-time gameplay
- If a feature needs changes during review, update on the same branch and push
