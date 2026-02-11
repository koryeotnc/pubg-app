// PUBG 전적 검색 모듈
const Stats = (function() {
    let currentData = null;
    let currentPerspective = 'tpp'; // tpp or fpp

    function init() {
        document.getElementById('btn-stats-search').addEventListener('click', doSearch);
        document.getElementById('stats-nickname').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doSearch();
        });

        // TPP/FPP 토글
        document.querySelector('.stats-perspective-toggle').addEventListener('click', function(e) {
            const btn = e.target.closest('.perspective-btn');
            if (!btn) return;
            currentPerspective = btn.dataset.perspective;
            document.querySelectorAll('.perspective-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (currentData) renderAll();
        });
    }

    async function doSearch() {
        const name = document.getElementById('stats-nickname').value.trim();
        if (!name) return;

        const platform = document.getElementById('stats-platform').value;
        const resultDiv = document.getElementById('stats-result');

        resultDiv.innerHTML = '<div class="stats-loading">검색 중...</div>';

        try {
            const res = await fetch(`/api/pubg-stats?name=${encodeURIComponent(name)}&platform=${platform}`);
            const data = await res.json();

            if (!res.ok) {
                resultDiv.innerHTML = `<div class="stats-error">${data.error || '오류 발생'}</div>`;
                return;
            }

            currentData = data;
            renderAll();

        } catch (err) {
            resultDiv.innerHTML = '<div class="stats-error">서버 연결 실패</div>';
        }
    }

    function renderAll() {
        const resultDiv = document.getElementById('stats-result');
        const suffix = currentPerspective === 'fpp' ? '-fpp' : '';

        // 경쟁전 (ranked)
        const rankedSquad = currentData.ranked['squad' + suffix];
        const rankedDuo = currentData.ranked['duo' + suffix];
        const rankedSolo = currentData.ranked['solo' + suffix];

        // 일반 게임 (normal)
        const normalSquad = currentData.normal['squad' + suffix];
        const normalDuo = currentData.normal['duo' + suffix];
        const normalSolo = currentData.normal['solo' + suffix];

        let html = `<div class="stats-player-name">${currentData.name}</div>`;

        // 경쟁전 섹션
        html += '<div class="stats-section-header ranked-header">경쟁전</div>';
        html += '<div class="stats-cards-row">';
        html += renderModeCard('솔로', rankedSolo, true);
        html += renderModeCard('듀오', rankedDuo, true);
        html += renderModeCard('스쿼드', rankedSquad, true);
        html += '</div>';

        // 일반 게임 섹션
        html += '<div class="stats-section-header normal-header">일반 게임 전적</div>';
        html += '<div class="stats-cards-row">';
        html += renderModeCard('솔로', normalSolo, false);
        html += renderModeCard('듀오', normalDuo, false);
        html += renderModeCard('스쿼드', normalSquad, false);
        html += '</div>';

        resultDiv.innerHTML = html;
    }

    function renderModeCard(label, stats, isRanked) {
        if (!stats) {
            return `
                <div class="stats-mode-card empty">
                    <div class="mode-card-title">${label}</div>
                    <div class="mode-card-empty">기록 없음</div>
                </div>`;
        }

        if (isRanked) {
            const tierText = stats.tier ? `${stats.tier} ${stats.subTier || ''}` : '-';
            const rpText = stats.rankPoint ? `${Math.round(stats.rankPoint)} RP` : '';
            const record = `${stats.wins}승 ${stats.roundsPlayed - stats.wins}패`;

            return `
                <div class="stats-mode-card ranked">
                    <div class="mode-card-title">${label} <span class="mode-card-record">${record}</span></div>
                    <div class="mode-card-tier">${tierText} ${rpText}</div>
                    <div class="mode-card-stats">
                        <div><span class="mc-label">K/D</span> <span class="mc-value">${stats.kd}</span></div>
                        <div><span class="mc-label">승률</span> <span class="mc-value">${stats.winRate}%</span></div>
                        <div><span class="mc-label">Top10</span> <span class="mc-value">${stats.top10Rate}%</span></div>
                    </div>
                    <div class="mode-card-stats">
                        <div><span class="mc-label">평균 딜량</span> <span class="mc-value">${stats.avgDamage}</span></div>
                        <div><span class="mc-label">게임 수</span> <span class="mc-value">${stats.roundsPlayed}</span></div>
                        <div><span class="mc-label">평균 등수</span> <span class="mc-value">#${stats.avgRank}</span></div>
                    </div>
                </div>`;
        }

        // Normal mode
        const record = `${stats.wins}승 ${stats.deaths}패`;
        return `
            <div class="stats-mode-card normal">
                <div class="mode-card-title">${label} <span class="mode-card-record">${record}</span></div>
                <div class="mode-card-stats">
                    <div><span class="mc-label">K/D</span> <span class="mc-value">${stats.kd}</span></div>
                    <div><span class="mc-label">승률</span> <span class="mc-value">${stats.winRate}%</span></div>
                    <div><span class="mc-label">Top10</span> <span class="mc-value">${stats.top10Rate}%</span></div>
                </div>
                <div class="mode-card-stats">
                    <div><span class="mc-label">평균 딜량</span> <span class="mc-value">${stats.avgDamage}</span></div>
                    <div><span class="mc-label">게임 수</span> <span class="mc-value">${stats.roundsPlayed}</span></div>
                    <div><span class="mc-label">헤드샷</span> <span class="mc-value">${stats.headshotRate}%</span></div>
                </div>
            </div>`;
    }

    return { init };
})();
