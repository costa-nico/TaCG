import Phaser from 'phaser';
import Card from '../cardForm.js';
import { cardList as cardsDB } from '../cardsDB.js';
import { EffectLibrary } from '../effectDB.js';


export default class BattleScene extends Phaser.Scene {
    // constructor accepts an options object: { boardY, playerHandY, maxBoardSize }
    constructor(options = {}) {
        super('BattleScene');
        // 모든 카드 인스턴스(데이터+객체) 관리
        this.cards = new Map(); 
        
        // 순서 관리를 위한 ID 배열
        this.enemyHandIds = [];
        this.enemyMinionIds = [];


        this.maxBoardSize = 3; // 전장 최대 슬롯

        // 화면 구도 설정 (기본값). Can be overridden via options.
        this.playerHandY = 960;    // 손패 Y축 위치
        this.boardCenterY = 540; // 전장 Y축 위치

        this.handWidth = 1000; // 손패 폭
        this.handHeight = 160; // 손패 높이

        this.boardWidth = 1000; // 전장 폭 (카드 배치 기준)
        this.boardHeight = 650; // 전장 높이 (배경 영역)

        this.playerMinionY = this.boardCenterY + 190; // 전장 카드 Y축 위치
        this.minionSpacing = 250; // 카드 간 간격
        this.handSpacing = 120; // 손패 카드 간 간격
        
        this.minionScale = 1.6; // 전장 카드 스케일

        this.enemy = {
            role: 'enemy',
            mana: 1,
            maxMana: 1,
            handIds: [],
            minionIds: []   
        };

        this.player = {
            role: 'player',
            mana: 1,
            maxMana: 1,
            handIds: [],
            minionIds: []
        };
        this.TurnPhase = this.player.role; // 초기 턴 설정`;
    }

    create() {
        const centerX = this.cameras.main.centerX;

        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;

        // 1. 전장 배경 구역 (화면의 메인 영역)
        const boardCenterX = centerX;
        const boardCenterY = this.boardCenterY;
        const boardWidth = this.boardWidth;
        const boardHeight = this.boardHeight;

        this.boardZone = this.add.rectangle(boardCenterX, boardCenterY, boardWidth, boardHeight, 0x111111, 0.4)
            .setStrokeStyle(6, 0x2C2C2C)
            .setOrigin(0.5)
            .setDepth(-1);

        // 2. 하단 손패 영역 배경
        this.handZone = this.add.rectangle(centerX, this.playerHandY,  this.handWidth, this.handHeight, 0x000000, 0)
            .setStrokeStyle(6, 0x2caa2c)
            .setOrigin(0.5)
            .setDepth(-1);

        this.playerManaText = this.add.text(250, gameHeight/2 + 50, `My Mana: ${this.player.mana}/${this.player.maxMana}`, {
            fontSize: '32px',
            fill: '#0055ff',
            fontWeight: 'bold',
            outline: '#000000',
            outlineThickness: 4
        }).setOrigin(0.5, 0.5);

        this.enemyManaText = this.add.text(250, gameHeight/2 - 50, `Enemy Mana: ${this.enemy.mana}/${this.enemy.maxMana}`, {
            fontSize: '32px',
            fill: '#0055ff',
            fontWeight: 'bold',
            outline: '#000000',
            outlineThickness: 4
        }).setOrigin(0.5, 0.5);


        this.endTurnButton = this.add.container(gameWidth - 300, gameHeight / 2)
            .setDepth(10)
        const buttonBg = this.add.rectangle(0, 0, 180, 80, 0xffcc00)
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5, 0.5);
        const buttonText = this.add.text(0, 0, 'End Turn', {
            fontSize: '32px',
            fill: '#000',
        }).setOrigin(0.5, 0.5);

        this.endTurnButton.add([buttonBg, buttonText]);
        buttonBg.on('pointerdown', () => {
            if (this.TurnPhase === this.player.role) {
                this.changeTurn();
            }
        });

        // 초기 테스트 카드 생성 (DB에서 데이터 참조)
        const testInitialIds = [0, 1, 0, 1, 2]; 
        testInitialIds.forEach(dbIdx => this.addCardToHand(cardsDB[dbIdx]));

        // 드래그 및 입력 이벤트 설정
        this.setupInputEvents();
        
        // 공격 화살표용 그래픽 객체
        this.attackGraphics = this.add.graphics();
        this.attackGraphics.setDepth(200); // 카드 위에 표시되도록 깊이 설정
    }
    changeTurn() {
        let newTurner;
        if(this.TurnPhase === this.player.role) {
            newTurner = this.enemy;
            this.endTurnButton.setAlpha(0.5);

            this.time.delayedCall(1000, () => {
                this.changeTurn();
            });

        } else {
            newTurner = this.player;
            this.endTurnButton.setAlpha(1);
        }
        this.TurnPhase = newTurner.role;
        console.log(`Turn changes to ${newTurner.role}`);

        newTurner.minionIds.forEach(id => {
            const c = this.cards.get(id);
            if (c) this.runAbility(c, 'onTurnEnd', newTurner);
        });

        newTurner.maxMana = Math.min(10, newTurner.maxMana + 1);
        newTurner.mana = newTurner.maxMana;

        newTurner.minionIds.forEach(id => {
            const c = this.cards.get(id);
            if (c) this.runAbility(c, 'onTurnStart', newTurner);
        });

        this.updateManaText(); 
    }
    updateManaText() {
        this.playerManaText.setText(`My Mana: ${this.player.mana}/${this.player.maxMana}`);
        this.enemyManaText.setText(`Enemy Mana: ${this.enemy.mana}/${this.enemy.maxMana}`);
    }

    // 카드 생성 및 Map 등록 (인스턴스화)
    addCardToHand(originData) {
        const instanceId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        console.log(`Adding card to hand: ${originData.name} (ID: ${instanceId})`);
        // 개별 카드의 독립적인 상태 데이터 생성 (Deep Copy)
        const instanceData = {
            ...originData,
            currentAtk: originData.atk,
            currentHp: originData.hp,
            instanceId: instanceId
        };

        // 시각적 객체 생성 (초기 위치는 화면 하단 밖)
        const cardObj = new Card(this, 960, 1200, instanceData, 1);
        cardObj.instanceId = instanceId;

        // Map에 데이터-객체 쌍으로 저장
        this.cards.set(instanceId, { data: instanceData, obj: cardObj });
        this.player.handIds.push(instanceId);

        this.repositionHand();
    }

    setupInputEvents() {
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if(this.TurnPhase !== this.player.role) return; // 플레이어 턴이 아닐 때 드래그 무시

            const id = gameObject.instanceId;
            
            // 손패에 있을 때만 위치 이동 가능
            if (this.player.handIds.includes(id)) {
                gameObject.x = dragX;
                gameObject.y = dragY;
                gameObject.setDepth(100);
            } 
            // 전장에 있으면 화살표 연출 (공격 모드)
            else if (this.player.minionIds.includes(id)) {
                this.drawAttackLine(gameObject, pointer); 
            }
        });

        this.input.on('dragend', (pointer, gameObject) => {
            const id = gameObject.instanceId;

            if (this.player.handIds.includes(id)) {
                const isOverBoard = Phaser.Geom.Rectangle.Contains(this.boardZone.getBounds(), pointer.x, pointer.y);
                if (isOverBoard) {
                    this.executeSummon(id, pointer.x, pointer.y, this.player);
                } else {
                    this.repositionHand(); // 제자리 복귀
                }
            } else {
                // 전장 카드 드롭 시 공격 로직 실행 (추후 구현)
                this.attackGraphics.clear();
            }
            gameObject.setDepth(0);
        });
    }

    // 좌우 선택형 소환 인덱스 계산
    calculateInsertIndex(dropX) {
        if (this.player.minionIds.length === 0) return 0;
        const centerX = this.cameras.main.centerX;
        return (dropX < centerX) ? 0 : this.player.minionIds.length;
    }

    executeSummon(id, x, y, master) {
        const card = this.cards.get(id);
        if (!card) return;

        if (master.minionIds.length >= this.maxBoardSize || master.mana < this.cards.get(id).data.cost) {
            this.repositionHand();
            return;
        }

        master.mana -= this.cards.get(id).data.cost;
        this.updateManaText();

        const insertIdx = this.calculateInsertIndex(x);
        
        // 배열 이동: 손패에서 제거 후 전장 삽입
        master.handIds = master.handIds.filter(hid => hid !== id);
        master.minionIds.splice(insertIdx, 0, id);

        // 소환 애니메이션: 크기를 키우며 전장으로 안착
        // set final UI scale for board (no container scale tween to avoid text blurring)
        if (card.obj.setUiScale) card.obj.setUiScale(2.5); // 소환 시 잠시 크게 보이도록
        this.tweens.add({
            targets: card.obj,
            x: x,
            y: this.playerMinionY,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => { 
                this.repositionBoard(); 
                // 소환 시 발동 효과 실행
                this.runAbility(card, 'onSummon', master);
            }
        });
        
        this.repositionHand();
    }

    // 카드 인스턴스의 능력(효과)를 실행하는 유틸
    runAbility(cardInstance, abilitySlot, master) {
        if (!cardInstance || !cardInstance.data || !cardInstance.data.abilities) return;
        const ability = cardInstance.data.abilities[abilitySlot];

        if (!ability || !ability.ID) return;
        
        const ID = ability.ID;
        const amount = ability.amount ;

        console.log(`${cardInstance.data.name}의 ${abilitySlot}효과 발동: ${ID} (${amount})`);

        const fn = EffectLibrary[ID];
        if (!fn) {
            console.warn(`Unknown effect ID: ${ID}`);
            return;
        }

        // determine target object based on ability.target
        let targetObj = null;
        const target = ability.target;
        if (target === 'self' || target === 'card') {
            targetObj = cardInstance;
        } else if (target === 'myMaster') {
            targetObj = master;
        } else if (target === 'enemyMaster') {
            targetObj = (master === this.player) ? this.enemy : this.player;
        }

        const source = { owner: master.role, data: cardInstance.data};
        fn(this, targetObj, amount, source);
    }

    // 전장 카드 중앙 정렬
    repositionBoard() {
        const minionSpacing = this.minionSpacing; 
        const centerX = this.cameras.main.centerX;
        const left = centerX - ((this.player.minionIds.length - 1) * minionSpacing) / 2;

        this.player.minionIds.forEach((id, idx) => {
            const card = this.cards.get(id);
            if (card) {
                if (card.obj.setUiScale) card.obj.setUiScale(this.minionScale);
                this.tweens.add({
                    targets: card.obj,
                    x: left + idx * minionSpacing,
                    y: this.playerMinionY,
                    duration: 100,
                    ease: 'power2',
                });
            }
        });
    }

    // 손패 카드 중앙 정렬
    repositionHand() {
        const minionSpacing = this.handSpacing;
        const centerX = this.cameras.main.centerX;
        const left = centerX - ((this.player.handIds.length - 1) * minionSpacing) / 2;

        this.player.handIds.forEach((id, idx) => {
            const card = this.cards.get(id);
            if (card) {
                const tx = left + idx * minionSpacing;
                card.obj.homeX = tx;
                card.obj.homeY = this.playerHandY;
                this.tweens.add({
                    targets: card.obj,
                    x: tx,
                    y: this.playerHandY,
                    duration: 100,
                    ease: 'Power2'
                });
            }
        });
    }

    drawAttackLine(source, pointer) {
        this.attackGraphics.clear();
        this.attackGraphics.lineStyle(6, 0xff0000, 0.8);
        this.attackGraphics.lineBetween(source.x, source.y, pointer.x, pointer.y);
    }
}