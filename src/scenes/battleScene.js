
import Phaser from 'phaser';
import Card from '../cardForm.js';
import { cardList as cardsDB } from '../cardsDB.js';
import { EffectLibrary } from '../effectDB.js';
import EnemyAI from '../enemyAI.js';


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
        this.boardCenterY = 540; // 전장 Y축 위치

        this.boardWidth = 1000; // 전장 폭 (카드 배치 기준)
        this.boardHeight = 650; // 전장 높이 (배경 영역)

        this.handWidth = 1000; // 손패 폭
        this.handHeight = 160; // 손패 높이

        this.handYoffset = 420
        this.playerHandY = this.boardCenterY + this.handYoffset;    // 손패 Y축 위치
        this.enemyHandY = this.boardCenterY - this.handYoffset; // 적 손패 Y축 위치 (화면 상단)

        this.minionYoffset = 170;
        this.playerMinionY = this.boardCenterY + this.minionYoffset; // 전장 카드 Y축 위치
        this.enemyMinionY = this.boardCenterY - this.minionYoffset; // 전장 카드 Y축 위치 (적)
        



        this.minionSpacing = 250; // 카드 간 간격
        this.handSpacing = 120; // 손패 카드 간 간격
        
        this.minionScale = 1.8; // 전장 카드 스케일

        this.enemy = {
            role: 'enemy',
            hp: 10,
            mana: 1,
            maxMana: 1,
            handIds: [],
            minionIds: []   
        };

        this.player = {
            role: 'player',
            hp: 10,
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
        const testInitialIds = [1, 1, 1, 2, 2]; 
        testInitialIds.forEach(dbIdx => this.addCardToHand(cardsDB[dbIdx], this.player));
        
        const testInitialIds2 = [0, 0, 0, 0, 0]; 
        testInitialIds2.forEach(dbIdx => this.addCardToHand(cardsDB[dbIdx], this.enemy));

        // 드래그 및 입력 이벤트 설정
        this.setupInputEvents();
        
        // 공격 화살표용 그래픽 객체
        this.attackGraphics = this.add.graphics();
        this.attackGraphics.setDepth(200); // 카드 위에 표시되도록 깊이 설정
    }
    changeTurn() {
        let newTurner;
        let oldTurner;
        if(this.TurnPhase === this.player.role) {
            newTurner = this.enemy;
            oldTurner = this.player;
            this.endTurnButton.setAlpha(0.5);
        } else {
            newTurner = this.player;
            oldTurner = this.enemy;
            this.endTurnButton.setAlpha(1);
        }

        oldTurner.minionIds.forEach(id => {
            const c = this.cards.get(id);
            if (c) this.runAbility(c, 'onTurnEnd', oldTurner);
        });


        this.TurnPhase = newTurner.role;

        console.log(`${newTurner.role}의 턴 시작`);

        newTurner.maxMana = Math.min(10, newTurner.maxMana + 1);
        newTurner.mana = newTurner.maxMana;

        newTurner.minionIds.forEach(id => {
            const c = this.cards.get(id);
            c.info.attackableTimes = 1;
            if (c) this.runAbility(c, 'onTurnStart', newTurner);
        });

        this.repositionBoard(); 
        this.updateManaText(); 

        if (newTurner === this.enemy) {
            EnemyAI.takeTurn(this);
        }
    }
    updateManaText() {
        this.playerManaText.setText(`My Mana: ${this.player.mana}/${this.player.maxMana}`);
        this.enemyManaText.setText(`Enemy Mana: ${this.enemy.mana}/${this.enemy.maxMana}`);
    }

    // 카드 생성 및 Map 등록 (인스턴스화)
    addCardToHand(originInfo, master) {
        const instanceId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        console.log(`${master.role}의 손패에 ${originInfo.name} (ID: ${instanceId}) 추가함`);
        // 개별 카드의 독립적인 상태 데이터 생성 (Deep Copy)
        const instanceInfo = {
            ...originInfo,
            currentAtk: originInfo.atk,
            currentHp: originInfo.hp,
            attackableTimes: 0, // 공격 가능 횟수 (턴마다 초기화)
            instanceId: instanceId,
            owner: master.role
        };

        // 시각적 객체 생성 (초기 위치는 화면 하단 밖)
        const cardObj = new Card(this, 960, 1200, instanceInfo, 1);
        cardObj.instanceId = instanceId;

        // Map에 데이터-객체 쌍으로 저장
        this.cards.set(instanceId, { info: instanceInfo, obj: cardObj });
        master.handIds.push(instanceId);

        this.repositionHand(master);
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
            else if (this.player.minionIds.includes(id) && gameObject.info.attackableTimes > 0) {
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
                    this.repositionHand(this.player); // 제자리 복귀
                }
            } else if (this.player.minionIds.includes(id)) {
                // 전장 카드 드롭 시 공격 로직
                // pointer 위치에 있는 적 minion 탐색
                const enemyMinions = this.enemy.minionIds.map(eid => this.cards.get(eid)).filter(card => card && card.obj);
                const target = enemyMinions.find(card => {
                    if (!card.obj.getBounds) return false;
                    const bounds = card.obj.getBounds();
                    return Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y);
                });
                if (target) {
                    this.attack(id, target.info.instanceId);
                }
                this.attackGraphics.clear();
            } else {
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

        if (master.minionIds.length >= this.maxBoardSize || master.mana < this.cards.get(id).info.cost) {
            this.repositionHand(master);
            return;
        }

        master.mana -= this.cards.get(id).info.cost;
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
                this.repositionBoard(master);
                // 소환 시 발동 효과 실행
                this.runAbility(card, 'onSummon', master);
            }
        });
        
        this.repositionHand(master);
    }

    // 카드 인스턴스의 능력(효과)를 실행하는 유틸
    runAbility(cardInstance, abilitySlot, master) {
        if (!cardInstance || !cardInstance.info || !cardInstance.info.abilities) return;
        const ability = cardInstance.info.abilities[abilitySlot];

        if (!ability || !ability.ID) return;
        
        const ID = ability.ID;
        const amount = ability.amount ;

        console.log(`${cardInstance.info.name}의 ${abilitySlot}효과 발동: ${ID} (${amount})`);

        const fn = EffectLibrary[ID];
        if (!fn) {
            console.warn(`Unknown effect ID: ${ID}`);
            return;
        }

        // determine target object based on ability.target
        let targetObj = null;
        const target = ability.target;
        if (target === 'self' || target === 'card') {
            targetObj = cardInstance.info;
        } else if (target === 'myMaster') {
            targetObj = master;
        } else if (target === 'enemyMaster') {
            targetObj = (master === this.player) ? this.enemy : this.player;
        }

        fn(this, targetObj, amount, cardInstance.info);
    }

    // 전장 카드 중앙 정렬
    // 전장 카드 중앙 정렬 (master: player/enemy)
    repositionBoard(master = 'both') {
        if(master === 'both') {
            this.repositionBoard(this.player);
            this.repositionBoard(this.enemy);
            return;
        }
        const minionSpacing = this.minionSpacing;
        const centerX = this.cameras.main.centerX;
        // Y축 위치 분기
        const y = (master === this.player) ? this.playerMinionY : this.enemyMinionY;
        const minionIds = master.minionIds;
        const left = centerX - ((minionIds.length - 1) * minionSpacing) / 2;

        minionIds.forEach((id, idx) => {
            const card = this.cards.get(id);
            if (card) {
                // 공격 가능 여부에 따라 UI 갱신
                card.obj.info.attackableTimes = card.info.attackableTimes;
                card.obj.updateUI();
                if (card.obj.setUiScale) card.obj.setUiScale(this.minionScale);
                this.tweens.add({
                    targets: card.obj,
                    x: left + idx * minionSpacing,
                    y: y,
                    duration: 100,
                    ease: 'power2',
                });
            }
        });
    }

    // 손패 카드 중앙 정렬 (master: player/enemy)
    repositionHand(master = 'both') {
        if(master === 'both') {
            this.repositionHand(this.player);
            this.repositionHand(this.enemy);
            return;
        }
        const minionSpacing = this.handSpacing;
        const centerX = this.cameras.main.centerX;
        // Y축 위치 분기
        const y = (master === this.player) ? this.playerHandY : this.enemyHandY;
        const handIds = master.handIds;
        const left = centerX - ((handIds.length - 1) * minionSpacing) / 2;

        handIds.forEach((id, idx) => {
            const card = this.cards.get(id);
            if (card) {
                const tx = left + idx * minionSpacing;
                card.obj.homeX = tx;
                card.obj.homeY = y;
                this.tweens.add({
                    targets: card.obj,
                    x: tx,
                    y: y,
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

        // 공격 함수: attacker, target 모두 카드 객체({data, obj}) 또는 플레이어 객체
    // BattleScene.js 내부
    attack(attackerID, targetID) {
        const attacker = this.cards.get(attackerID);
        const target = this.cards.get(targetID);
        if (!attacker || !target) return;

        const attackerObj = attacker.obj;
        const targetObj = target.obj;
        if (!attackerObj || !targetObj) return;

        const offsetY = (attacker.info.owner === 'player') ? 100 : -100; // 공격 방향에 따른 Y 오프셋

        const origX = attackerObj.x;
        const origY = attackerObj.y;
        const targetX = targetObj.x;
        const targetY = targetObj.y + offsetY;

        // [수정] timeline 대신 chain을 사용해!!!!!
        this.tweens.chain({
            targets: attackerObj,
            tweens: [
                // 1. 살짝 커지기
                { scale: 1.3, depth: 300, duration: 200, ease: 'Quad.easeOut'},
                // 2. 타겟으로 돌진
                { scale: 1.1, x: targetX, y: targetY, duration: 120, ease: 'Quad.easeIn' },
                // 3. 충격 연출 (흔들림은 따로 처리하거나 짧은 이동으로 대체)
                { x: targetX + 10, duration: 40, yoyo: true, repeat: 3 },
                // 4. 원래 위치로 복귀
                { x: origX, y: origY, scale: 1.0, depth: 0, duration: 300, ease: 'Quad.easeOut' }
            ],
            onComplete: () => {
                // 실제 데미지 처리
                target.info.hp -= attacker.info.atk;
                attacker.info.hp -= target.info.atk;
                
                // UI 갱신 (객체가 살아있는지 확인 필수!!!!!)
                if (targetObj.active) targetObj.updateUI();
                if (attackerObj.active) attackerObj.updateUI();

                console.log(`${attacker.info.name}의 공격 완료!!!!!`);

                // 사망 처리 로직 호출
                if (target.info.hp <= 0) {
                    this.removeCardFromBoard(targetID, target.info.owner);
                }
                if (attacker.info.hp <= 0) {
                    this.removeCardFromBoard(attackerID, attacker.info.owner);
                }
            }
        });
    }

    // hp<=0인 유닛을 전장에서 제거 (AI와 동일 로직, 중복 방지)
    removeCardFromBoard(cardId, master) {
        master = (master === 'player') ? this.player : this.enemy;
        const card = this.cards.get(cardId);
        if (!card) return;

        card.obj.destroy();
        this.cards.delete(cardId);

        master.minionIds = master.minionIds.filter(id => id !== cardId);

        this.repositionBoard();
        console.log(`${card.info.name}이 제거되었습니다.`);
    }
}