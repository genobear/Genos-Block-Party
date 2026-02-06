import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MusicScene } from '../scenes/MusicScene';
import { MenuScene } from '../scenes/MenuScene';
import { ModeSelectScene } from '../scenes/ModeSelectScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { PauseScene } from '../scenes/PauseScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { MusicPlayerScene } from '../scenes/MusicPlayerScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { ShopScene } from '../scenes/ShopScene';
import { StatsScene } from '../scenes/StatsScene';
import { GAME_WIDTH, GAME_HEIGHT } from './Constants';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MusicScene, MenuScene, ModeSelectScene, ShopScene, StatsScene, SettingsScene, MusicPlayerScene, GameScene, UIScene, PauseScene, GameOverScene],
  input: {
    activePointers: 1,
    touch: {
      capture: true,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
};
