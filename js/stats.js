// PUBG 전적 검색 모듈
const Stats = (function() {
    const MODE_LABELS = {
        'squad': '스쿼드 TPP',
        'squad-fpp': '스쿼드 FPP',
        'duo': '듀오 TPP',
        'duo-fpp': '듀오 FPP',
        'solo': '솔로 TPP',
        'solo-fpp': '솔로 FPP'
    };

    // 기본 모드 순서 (squad TPP 우선)
    const MODE_ORDER = ['squad', 'squad-fpp', 'duo', 'duo-fpp', 'solo', 'solo-fpp'];

    let currentData = null;
    let currentMode = 'squad';

    function init() {
        const searchBtn = document.getElementById('btn-stats-search');
        const input = document.getElementById('stats-nickname');

        searchBtn.addEventListener('click', doSearch);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doSearch();
        });

        // 모드 탭 이벤트
        document.getElementById('stats-mode-tabs').addEventListener('click', function(e) {
            const tab = e.target.closest('.stats-mode-tab');
            if (!tab) return;
            const mode = tab.dataset.mode;
            if (mode && currentData && currentData.modes[mode]) {
                currentMode = mode;
                renderModeTabs();
                renderStats(currentData.modes[mode]);
            }
        });
    }

    async function doSearch() {
        const input = document.getElementById('stats-nickname');
        const name = input.value.trim();
        if (!name) return;

        const platform = document.getElementById('stats-platform').value;
        const resultDiv = document.getElementById('stats-result');
        const modeTabs = document.getElementById('stats-mode-tabs');

        resultDiv.innerHTML = '<div class="stats-loading">검색 중...</div>';
        modeTabs.innerHTML = '';

        try {
            const res = await fetch(`/api/pubg-stats?name=${encodeURIComponent(name)}&platform=${platform}`);
            const data = await res.json();

            if (!res.ok) {
                resultDiv.innerHTML = `<div class="stats-error">${data.error || '오류 발생'}</div>`;
                return;
            }

            currentData = data;

            // 사용 가능한 모드 중 첫 번째를 기본 선택
            const availableModes = MODE_ORDER.filter(m => data.modes[m]);
            if (availableModes.length === 0) {
                resultDiv.innerHTML = '<div class="stats-error">전적 데이터가 없습니다</div>';
                return;
            }

            // squad TPP가 있으면 기본, 없으면 첫 번째 모드
            currentMode = availableModes.includes('squad') ? 'squad' : availableModes[0];

            renderModeTabs();
            renderStats(data.modes[currentMode]);

        } catch (err) {
            resultDiv.innerHTML = '<div class="stats-error">서버 연결 실패</div>';
        }
    }

    function renderModeTabs() {
        const container = document.getElementById('stats-mode-tabs');
        if (!currentData) return;

        const availableModes = MODE_ORDER.filter(m => currentData.modes[m]);
        container.innerHTML = availableModes.map(mode => {
            const active = mode === currentMode ? 'active' : '';
            const label = MODE_LABELS[mode] || mode;
            return `<button class="stats-mode-tab ${active}" data-mode="${mode}">${label}</button>`;
        }).join('');
    }

    function renderStats(stats) {
        const resultDiv = document.getElementById('stats-result');

        resultDiv.innerHTML = `
            <div class="stats-player-name">${currentData.name}</div>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.kd}</div>
                    <div class="stat-label">K/D</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.winRate}%</div>
                    <div class="stat-label">승률</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.avgDamage}</div>
                    <div class="stat-label">평균 딜</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.roundsPlayed}</div>
                    <div class="stat-label">매치</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.kills}</div>
                    <div class="stat-label">킬</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.top10Rate}%</div>
                    <div class="stat-label">Top10</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.headshotRate}%</div>
                    <div class="stat-label">헤드샷</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round(stats.longestKill)}m</div>
                    <div class="stat-label">최장 킬</div>
                </div>
            </div>
            <div class="stats-detail">
                <span>${stats.wins}승 ${stats.deaths}패</span>
                <span>어시: ${stats.assists}</span>
            </div>
        `;
    }

    return { init };
})();
