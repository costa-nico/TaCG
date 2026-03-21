import Phaser from 'phaser';
import MainScene from './scenes/mainScene';
import BattleScene from './scenes/battleScene';

const VIRTUAL_WIDTH = 1920;
const VIRTUAL_HEIGHT = 1080;

const config = {
    type: Phaser.AUTO,
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
    scale: {
        mode: Phaser.Scale.FIT, // 고정 가상 해상도를 비례 스케일
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { pixelArt: false, antialias: true },
    
    resolution: window.devicePixelRatio || 1,
    parent: 'game-container',
    backgroundColor: '#FAFAF8',
    scene: [MainScene, BattleScene],
};

const game = new Phaser.Game(config);

