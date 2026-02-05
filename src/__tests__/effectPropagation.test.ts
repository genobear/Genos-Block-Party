import { describe, it, expect, vi } from 'vitest';
import { PowerUpType } from '../types/PowerUpTypes';

/**
 * Create mock ball with effect tracking
 */
const createMockBall = () => ({
  setFireball: vi.fn(),
  setElectricBall: vi.fn(),
  setBalloon: vi.fn(),
  applySpeedModifier: vi.fn(),
  body: { velocity: { x: 100, y: -200 } },
});

/**
 * Effect propagation configuration interface (mirrors PowerUpSystem)
 */
interface EffectPropagationConfig {
  propagateToNewBalls: boolean;
  applyToAllBalls: boolean;
  applyToBall: (ball: ReturnType<typeof createMockBall>) => void;
  isActive: () => boolean;
}

/**
 * Create test propagation configs that mirror PowerUpSystem behavior
 * This allows testing the propagation logic without Phaser dependencies
 */
function createPropagationConfigs(state: {
  fireballLevel: number;
  electricBallEndTime: number;
  balloonEndTime: number;
  currentTime: number;
}): Map<PowerUpType, EffectPropagationConfig> {
  return new Map([
    [PowerUpType.FIREBALL, {
      propagateToNewBalls: true,
      applyToAllBalls: true,
      applyToBall: (ball: ReturnType<typeof createMockBall>) => ball.setFireball(state.fireballLevel),
      isActive: () => state.fireballLevel > 0,
    }],
    [PowerUpType.ELECTRICBALL, {
      propagateToNewBalls: true,
      applyToAllBalls: true,
      applyToBall: (ball: ReturnType<typeof createMockBall>) => ball.setElectricBall(),
      isActive: () => state.electricBallEndTime > state.currentTime,
    }],
    [PowerUpType.BALLOON, {
      propagateToNewBalls: false, // Intentional: new balls spawn at normal speed
      applyToAllBalls: true,
      applyToBall: (ball: ReturnType<typeof createMockBall>) => ball.setBalloon(),
      isActive: () => state.balloonEndTime > state.currentTime,
    }],
  ]);
}

/**
 * Apply propagatable effects to a new ball (mirrors PowerUpSystem.applyEffectsToNewBall)
 */
function applyEffectsToNewBall(
  ball: ReturnType<typeof createMockBall>,
  configs: Map<PowerUpType, EffectPropagationConfig>
): void {
  configs.forEach((config) => {
    if (config.propagateToNewBalls && config.isActive()) {
      config.applyToBall(ball);
    }
  });
}

describe('Ball Effect Propagation System', () => {
  describe('Propagation config correctness', () => {
    it('Fireball should have propagateToNewBalls=true', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 1,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const fireballConfig = configs.get(PowerUpType.FIREBALL);
      expect(fireballConfig?.propagateToNewBalls).toBe(true);
    });

    it('ElectricBall should have propagateToNewBalls=true', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 2000,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const electricConfig = configs.get(PowerUpType.ELECTRICBALL);
      expect(electricConfig?.propagateToNewBalls).toBe(true);
    });

    it('Balloon should have propagateToNewBalls=false (intentional design)', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 2000,
        currentTime: 1000,
      });

      const balloonConfig = configs.get(PowerUpType.BALLOON);
      expect(balloonConfig?.propagateToNewBalls).toBe(false);
    });

    it('All three effects should have applyToAllBalls=true', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      expect(configs.get(PowerUpType.FIREBALL)?.applyToAllBalls).toBe(true);
      expect(configs.get(PowerUpType.ELECTRICBALL)?.applyToAllBalls).toBe(true);
      expect(configs.get(PowerUpType.BALLOON)?.applyToAllBalls).toBe(true);
    });
  });

  describe('Effect application to new balls', () => {
    it('When fireball is active, new ball gets setFireball called', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 2,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setFireball).toHaveBeenCalledWith(2);
    });

    it('When electric ball is active, new ball gets setElectricBall called', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 5000,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setElectricBall).toHaveBeenCalled();
    });

    it('When balloon is active, new ball does NOT get the slow effect', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 5000,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      // Balloon should NOT be applied to new balls
      expect(newBall.setBalloon).not.toHaveBeenCalled();
    });

    it('Multiple active effects - only propagatable ones apply', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 3,
        electricBallEndTime: 5000,
        balloonEndTime: 5000,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      // Fireball and Electric should apply
      expect(newBall.setFireball).toHaveBeenCalledWith(3);
      expect(newBall.setElectricBall).toHaveBeenCalled();
      // Balloon should NOT apply (propagateToNewBalls=false)
      expect(newBall.setBalloon).not.toHaveBeenCalled();
    });
  });

  describe('Fireball level inheritance', () => {
    it('New balls receive current fireball level 1', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 1,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setFireball).toHaveBeenCalledWith(1);
    });

    it('New balls receive current fireball level 2', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 2,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setFireball).toHaveBeenCalledWith(2);
    });

    it('New balls receive current fireball level 3 (max visual tier)', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 3,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setFireball).toHaveBeenCalledWith(3);
    });

    it('New balls receive high fireball level (stacked)', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 7,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setFireball).toHaveBeenCalledWith(7);
    });
  });

  describe('Inactive effect handling', () => {
    it('When fireball is inactive (level 0), new balls do not receive it', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setFireball).not.toHaveBeenCalled();
    });

    it('When electric ball timer expired, new balls do not receive it', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 500, // Expired (500 < 1000)
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setElectricBall).not.toHaveBeenCalled();
    });

    it('When balloon timer expired, it would not apply anyway (propagateToNewBalls=false)', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 500, // Expired
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      // Should not be called regardless (even if it were active)
      expect(newBall.setBalloon).not.toHaveBeenCalled();
    });

    it('isActive() correctly reflects fireball state', () => {
      const activeConfigs = createPropagationConfigs({
        fireballLevel: 1,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const inactiveConfigs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      expect(activeConfigs.get(PowerUpType.FIREBALL)?.isActive()).toBe(true);
      expect(inactiveConfigs.get(PowerUpType.FIREBALL)?.isActive()).toBe(false);
    });

    it('isActive() correctly reflects electric ball timer state', () => {
      const activeConfigs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 2000,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const expiredConfigs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 500,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      expect(activeConfigs.get(PowerUpType.ELECTRICBALL)?.isActive()).toBe(true);
      expect(expiredConfigs.get(PowerUpType.ELECTRICBALL)?.isActive()).toBe(false);
    });

    it('isActive() correctly reflects balloon timer state', () => {
      const activeConfigs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 2000,
        currentTime: 1000,
      });

      const expiredConfigs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 500,
        currentTime: 1000,
      });

      expect(activeConfigs.get(PowerUpType.BALLOON)?.isActive()).toBe(true);
      expect(expiredConfigs.get(PowerUpType.BALLOON)?.isActive()).toBe(false);
    });
  });

  describe('Integration: Simulated spawn flow', () => {
    it('Disco ball spawn with active fireball applies to all new balls', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 2,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      // Simulate spawning 2 new balls (Disco ball effect)
      const newBalls = [createMockBall(), createMockBall()];
      newBalls.forEach(ball => applyEffectsToNewBall(ball, configs));

      // Both balls should get fireball level 2
      expect(newBalls[0].setFireball).toHaveBeenCalledWith(2);
      expect(newBalls[1].setFireball).toHaveBeenCalledWith(2);
    });

    it('Disco ball spawn with active balloon does NOT slow new balls', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 5000,
        currentTime: 1000,
      });

      const newBalls = [createMockBall(), createMockBall()];
      newBalls.forEach(ball => applyEffectsToNewBall(ball, configs));

      // Neither ball should get balloon (intentional design)
      expect(newBalls[0].setBalloon).not.toHaveBeenCalled();
      expect(newBalls[1].setBalloon).not.toHaveBeenCalled();
    });

    it('Full active state applies both fireball and electric to new balls', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 5,
        electricBallEndTime: 8000,
        balloonEndTime: 10000, // Active but won't propagate
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      expect(newBall.setFireball).toHaveBeenCalledWith(5);
      expect(newBall.setElectricBall).toHaveBeenCalled();
      expect(newBall.setBalloon).not.toHaveBeenCalled();
    });

    it('No active effects results in vanilla ball', () => {
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const newBall = createMockBall();
      applyEffectsToNewBall(newBall, configs);

      // No effects should be applied
      expect(newBall.setFireball).not.toHaveBeenCalled();
      expect(newBall.setElectricBall).not.toHaveBeenCalled();
      expect(newBall.setBalloon).not.toHaveBeenCalled();
    });

    it('Effect expiring mid-spawn only applies to balls spawned before expiry', () => {
      // Simulate time-based expiry scenario
      const createConfigsAtTime = (time: number) => createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 1500, // Expires at 1500
        balloonEndTime: 0,
        currentTime: time,
      });

      // Ball spawned before expiry
      const ball1 = createMockBall();
      applyEffectsToNewBall(ball1, createConfigsAtTime(1000));
      expect(ball1.setElectricBall).toHaveBeenCalled();

      // Ball spawned after expiry
      const ball2 = createMockBall();
      applyEffectsToNewBall(ball2, createConfigsAtTime(2000));
      expect(ball2.setElectricBall).not.toHaveBeenCalled();
    });
  });

  describe('Design rationale validation', () => {
    it('Balloon not propagating is intentional - new balls should spawn fast', () => {
      // This test documents the design decision:
      // Balloon slows existing balls but new balls spawn at normal speed
      // This prevents the "slow trap" where all balls become unusably slow

      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 0,
        balloonEndTime: 5000,
        currentTime: 1000,
      });

      const balloonConfig = configs.get(PowerUpType.BALLOON);
      
      // Verify balloon is active
      expect(balloonConfig?.isActive()).toBe(true);
      // But propagation is disabled
      expect(balloonConfig?.propagateToNewBalls).toBe(false);
      // Though it does apply to all existing balls
      expect(balloonConfig?.applyToAllBalls).toBe(true);
    });

    it('Fireball propagating preserves damage potential during multi-ball', () => {
      // Fireball should propagate so stacked damage isn't lost
      const configs = createPropagationConfigs({
        fireballLevel: 5,
        electricBallEndTime: 0,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const fireballConfig = configs.get(PowerUpType.FIREBALL);
      
      expect(fireballConfig?.propagateToNewBalls).toBe(true);
      expect(fireballConfig?.isActive()).toBe(true);
    });

    it('ElectricBall propagating maintains AOE capability across all balls', () => {
      // Electric ball should propagate for consistent AOE damage
      const configs = createPropagationConfigs({
        fireballLevel: 0,
        electricBallEndTime: 5000,
        balloonEndTime: 0,
        currentTime: 1000,
      });

      const electricConfig = configs.get(PowerUpType.ELECTRICBALL);
      
      expect(electricConfig?.propagateToNewBalls).toBe(true);
      expect(electricConfig?.isActive()).toBe(true);
    });
  });
});
