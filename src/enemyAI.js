// Simple Enemy AI for prototype: chooses playable cards by heuristic
// Integrates with BattleScene's data structures: scene.enemy, scene.player, scene.cards

export default {
    takeTurn: function(scene, options = {}) {
        const enemy = scene.enemy;
        const player = scene.player;
        if (!enemy || !player || !scene.cards) return;

        // 카드 점수 함수
        const scoreCard = (info) => {
            const atk = info.atk || 0;
            const hp = info.hp || 0;
            const cost = info.cost || 0;
            let score = atk + hp + (Math.random() - 0.5) * 0.5;
            if (info.abilities) score += 1.5;
            score = score / (cost || 0.5);
            return score;
        };

        // 카드 사용 시도
        function actPlayCard() {
            console.log(`적 : 손패보는중...`)
            const playable = enemy.handIds
                .map(id => scene.cards.get(id))
                .filter(card => card && card.info && (card.info.cost <= enemy.mana));
            if (playable.length === 0) {
                setTimeout(actAttack, 200);
                return;
            }
            // 점수로 정렬
            const evaluated = playable.map(card => ({ id: card.info.instanceId, score: scoreCard(card.info), info: card.info }));
            evaluated.sort((a, b) => b.score - a.score);
            const pick = evaluated[0];
            if (!pick || enemy.minionIds.length >= 3) {
                setTimeout(actAttack, 100);
                return;
            }
            // 카드 소환
            const cost = pick.info.cost || 0;
            enemy.mana = Math.max(0, enemy.mana - cost);
            enemy.handIds = enemy.handIds.filter(hid => hid !== pick.id);
            enemy.minionIds.push(pick.id);
            scene.runAbility && scene.runAbility(pick.info, 'onSummon', enemy, player);
            console.log(`Enemy summoned ${pick.info.name} (cost ${cost})`);
            scene.updateManaText && scene.updateManaText();
            scene.repositionHand && scene.repositionHand(enemy);
            scene.repositionBoard && scene.repositionBoard(enemy);
            setTimeout(actPlayCard, 350);
        }

        // 공격 시도
        function actAttack() {
            console.log(`적 : 공격시도중...`)
            const enemyMinions = enemy.minionIds.map(id => scene.cards.get(id)).filter(card => card && card.info);
            const playerMinions = player.minionIds.map(id => scene.cards.get(id)).filter(card => card && card.info);
            if (enemyMinions.length === 0 || playerMinions.length === 0) {
                // 유닛 없음 → 턴 종료
                setTimeout(() => scene.changeTurn(), 100);
                return;
            }
            let attackable = enemyMinions.filter(m => m.info.attackableTimes > 0);
            if (attackable.length === 0) {
                setTimeout(() => scene.changeTurn(), 100);
                return;
            }
            let attacker = attackable[Math.floor(Math.random() * attackable.length)];
            let target = playerMinions[Math.floor(Math.random() * playerMinions.length)];

            // 공격 실행
            scene.attack(attacker.info.instanceId, target.info.instanceId);
            attacker.info.attackableTimes -= 1;

            setTimeout(() => actPlayCard(), 1000);
        }

        actPlayCard();
    }
};
