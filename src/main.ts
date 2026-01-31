import Phaser from 'phaser';
import { GAME_CONFIG } from './config/GameConfig';

// Create the game instance
const game = new Phaser.Game(GAME_CONFIG);

// Export for potential debugging
(window as unknown as { game: Phaser.Game }).game = game;
