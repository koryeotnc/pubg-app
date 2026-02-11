// PUBG 전적 검색 모듈 (오버레이 패널)
const Stats = (function() {
    let currentData = null;
    let currentPerspective = 'tpp';
    let currentTab = 'overview';
    let matchCache = [];
    let matchLoadIndex = 0;
    let isLoadingMatches = false;

    const MAP_NAMES = {
        'Baltic_Main': '에란겔',
        'Desert_Main': '미라마',
        'Savage_Main': '사녹',
        'DihorOtok_Main': '비켄디',
        'Tiger_Main': '태이고',
        'Kiki_Main': '데스턴',
        'Neon_Main': '론도',
        'Heaven_Main': '헤이븐',
        'Chimera_Main': '파라모'
    };

    const MODE_NAMES = {
        'squad': '스쿼드', 'squad-fpp': '스쿼드 FPP',
        'duo': '듀오', 'duo-fpp': '듀오 FPP',
        'solo': '솔로', 'solo-fpp': '솔로 FPP',
        'tdm': '팀 데스매치', 'normal-squad': '스쿼드',
        'normal-squad-fpp': '스쿼드 FPP',
        'normal-duo': '듀오', 'normal-duo-fpp': '듀오 FPP',
        'normal-solo': '솔로', 'normal-solo-fpp': '솔로 FPP',
        'war-squad': '전쟁 모드', 'war-squad-fpp': '전쟁 모드 FPP'
    };

    function init() {
        // 검색 버튼
        document.getElementById('btn-stats-search').addEventListener('click', () => {
            const name = document.getElementById('stats-nickname').value.trim();
            if (name) doSearch(name);
        });

        // 엔터 키
        document.getElementById('stats-nickname').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const name = document.getElementById('stats-nickname').value.trim();
                if (name) doSearch(name);
            }
        });

        // 닫기 버튼
        document.getElementById('btn-close-stats').addEventListener('click', close);

        // 오버레이 배경 클릭 닫기
        document.getElementById('stats-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) close();
        });

        // ESC 키
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('stats-overlay');
                if (overlay.style.display !== 'none') {
                    close();
                }
            }
        });

        // TPP/FPP 토글
        document.querySelector('#stats-overlay .stats-perspective-toggle').addEventListener('click', (e) => {
            const btn = e.target.closest('.perspective-btn');
            if (!btn) return;
            currentPerspective = btn.dataset.perspective;
            document.querySelectorAll('#stats-overlay .perspective-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (currentData) renderCurrentTab();
        });

        // 탭 전환
        document.getElementById('stats-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.stats-tab');
            if (!tab) return;
            currentTab = tab.dataset.tab;
            document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderCurrentTab();
        });
    }

    function open() {
        document.getElementById('stats-overlay').style.display = 'flex';
        document.getElementById('stats-nickname').focus();
    }

    function close() {
        document.getElementById('stats-overlay').style.display = 'none';
    }

    async function doSearch(name) {
        document.getElementById('stats-nickname').value = name;
        const platform = document.getElementById('stats-platform').value;
        const contentDiv = document.getElementById('stats-content');

        // 헤더, 탭 숨기기
        document.getElementById('stats-player-header').style.display = 'none';
        document.getElementById('stats-tabs').style.display = 'none';
        contentDiv.innerHTML = '<div class="stats-loading">검색 중...</div>';

        // 매치 캐시 초기화
        matchCache = [];
        matchLoadIndex = 0;

        try {
            const res = await fetch(`/api/pubg-stats?name=${encodeURIComponent(name)}&platform=${platform}`);
            const data = await res.json();

            if (!res.ok) {
                contentDiv.innerHTML = `<div class="stats-error">${data.error || '오류 발생'}</div>`;
                return;
            }

            currentData = data;
            currentTab = 'overview';

            // 플레이어 헤더 표시
            document.getElementById('stats-player-name').textContent = data.name;
            document.getElementById('stats-platform-badge').textContent = data.platform === 'kakao' ? '카카오' : '스팀';
            document.getElementById('stats-player-header').style.display = 'flex';

            // 탭 표시 + 개요 활성화
            document.getElementById('stats-tabs').style.display = 'flex';
            document.querySelectorAll('.stats-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === 'overview');
            });

            renderCurrentTab();

        } catch (err) {
            contentDiv.innerHTML = '<div class="stats-error">서버 연결 실패</div>';
        }
    }

    function renderCurrentTab() {
        if (currentTab === 'overview') {
            renderOverview();
        } else if (currentTab === 'matches') {
            renderMatches();
        }
    }

    // ===== 개요 탭 =====
    function renderOverview() {
        const contentDiv = document.getElementById('stats-content');
        const suffix = currentPerspective === 'fpp' ? '-fpp' : '';

        const rankedSquad = currentData.ranked['squad' + suffix];
        const rankedDuo = currentData.ranked['duo' + suffix];
        const rankedSolo = currentData.ranked['solo' + suffix];

        const normalSquad = currentData.normal['squad' + suffix];
        const normalDuo = currentData.normal['duo' + suffix];
        const normalSolo = currentData.normal['solo' + suffix];

        let html = '';

        // 경쟁전
        html += '<div class="stats-section-header ranked-header">경쟁전</div>';
        html += '<div class="stats-cards-row">';
        html += renderModeCard('솔로', rankedSolo, true);
        html += renderModeCard('듀오', rankedDuo, true);
        html += renderModeCard('스쿼드', rankedSquad, true);
        html += '</div>';

        // 일반
        html += '<div class="stats-section-header normal-header">일반 게임 전적</div>';
        html += '<div class="stats-cards-row">';
        html += renderModeCard('솔로', normalSolo, false);
        html += renderModeCard('듀오', normalDuo, false);
        html += renderModeCard('스쿼드', normalSquad, false);
        html += '</div>';

        contentDiv.innerHTML = html;
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
                        <div><span class="mc-label">Top10</span> <span class="mc-value">${stats.top10Rate !== '-' ? stats.top10Rate + '%' : '-'}</span></div>
                    </div>
                    <div class="mode-card-stats">
                        <div><span class="mc-label">평균 딜량</span> <span class="mc-value">${stats.avgDamage}</span></div>
                        <div><span class="mc-label">게임 수</span> <span class="mc-value">${stats.roundsPlayed}</span></div>
                        <div><span class="mc-label">평균 등수</span> <span class="mc-value">#${stats.avgRank}</span></div>
                    </div>
                </div>`;
        }

        // Normal
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

    // ===== 매치 기록 탭 =====
    function renderMatches() {
        const contentDiv = document.getElementById('stats-content');

        if (!currentData.matchIds || currentData.matchIds.length === 0) {
            contentDiv.innerHTML = '<div class="stats-error">최근 매치 기록이 없습니다</div>';
            return;
        }

        // 이미 로드된 매치가 있으면 바로 표시
        if (matchCache.length > 0) {
            renderMatchList();
            return;
        }

        contentDiv.innerHTML = '<div class="match-loading">매치 기록 로딩 중...</div>';
        loadMoreMatches();
    }

    async function loadMoreMatches() {
        if (isLoadingMatches) return;
        isLoadingMatches = true;

        const matchIds = currentData.matchIds;
        const batchSize = 5;
        const start = matchLoadIndex;
        const end = Math.min(start + batchSize, matchIds.length);
        const batch = matchIds.slice(start, end);

        if (batch.length === 0) {
            isLoadingMatches = false;
            return;
        }

        try {
            const shard = currentData.platform;
            const playerId = currentData.playerId;

            const results = await Promise.all(
                batch.map(id =>
                    fetch(`/api/pubg-match?id=${encodeURIComponent(id)}&shard=${shard}&playerId=${encodeURIComponent(playerId)}`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                )
            );

            const validResults = results.filter(r => r !== null);
            matchCache.push(...validResults);
            matchLoadIndex = end;

            renderMatchList();

        } catch (err) {
            console.error('Match load error:', err);
        }

        isLoadingMatches = false;
    }

    function renderMatchList() {
        const contentDiv = document.getElementById('stats-content');
        const matchIds = currentData.matchIds;
        const hasMore = matchLoadIndex < matchIds.length;

        let html = '<div class="match-list">';

        for (const match of matchCache) {
            html += renderMatchItem(match);
        }

        html += '</div>';

        if (hasMore) {
            html += `<button class="match-load-more" id="btn-load-more-matches">
                더 보기 (${matchLoadIndex}/${matchIds.length})
            </button>`;
        }

        contentDiv.innerHTML = html;

        // 더 보기 버튼 이벤트
        const loadMoreBtn = document.getElementById('btn-load-more-matches');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', async () => {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = '로딩 중...';
                await loadMoreMatches();
            });
        }

        // 팀원 클릭 이벤트
        contentDiv.querySelectorAll('.teammate-link:not(.self)').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const name = link.dataset.name;
                if (name) doSearch(name);
            });
        });
    }

    function renderMatchItem(match) {
        if (!match || !match.player) return '';

        const p = match.player;
        const rank = match.roster ? match.roster.rank : p.winPlace;
        const totalTeams = match.totalTeams;
        const isWin = rank === 1;
        const isTop10 = rank <= 10;

        const itemClass = isWin ? 'win' : (isTop10 ? 'top10' : '');
        const rankClass = isWin ? 'win' : (isTop10 ? 'top10' : 'normal');

        const mapName = MAP_NAMES[match.mapName] || match.mapName;
        const modeName = MODE_NAMES[match.gameMode] || match.gameMode;
        const timeAgo = getTimeAgo(match.createdAt);

        // 생존 시간 포맷
        const survMin = Math.floor(p.timeSurvived / 60);
        const survSec = Math.round(p.timeSurvived % 60);
        const survText = `${survMin}분 ${survSec}초`;

        // 이동 거리 포맷
        const totalDist = ((p.walkDistance + p.rideDistance) / 1000).toFixed(2);

        // 팀원 목록
        let teammatesHtml = '';
        if (match.roster && match.roster.participants) {
            teammatesHtml = '<div class="match-teammates"><span class="match-teammates-label">팀원</span>';
            match.roster.participants.forEach(t => {
                const isSelf = t.name === currentData.name;
                if (isSelf) {
                    teammatesHtml += `<span class="teammate-link self">${t.name}</span>`;
                } else {
                    teammatesHtml += `<button class="teammate-link" data-name="${t.name}">${t.name}</button>`;
                }
            });
            teammatesHtml += '</div>';
        }

        return `
            <div class="match-item ${itemClass}">
                <div class="match-header">
                    <span class="match-mode">${modeName}</span>
                    <span class="match-rank ${rankClass}">#${rank} <span style="font-weight:400;font-size:11px;color:rgba(255,255,255,0.35)">/${totalTeams}</span></span>
                    <span class="match-map">${mapName}</span>
                    <span class="match-time">${timeAgo}</span>
                </div>
                <div class="match-stats-grid">
                    <div class="match-stat">
                        <span class="match-stat-label">킬</span>
                        <span class="match-stat-value">${p.kills}</span>
                    </div>
                    <div class="match-stat">
                        <span class="match-stat-label">딜량</span>
                        <span class="match-stat-value">${p.damageDealt}</span>
                    </div>
                    <div class="match-stat">
                        <span class="match-stat-label">DBNO</span>
                        <span class="match-stat-value">${p.DBNOs}</span>
                    </div>
                    <div class="match-stat">
                        <span class="match-stat-label">이동</span>
                        <span class="match-stat-value">${totalDist}km</span>
                    </div>
                    <div class="match-stat">
                        <span class="match-stat-label">생존</span>
                        <span class="match-stat-value">${survText}</span>
                    </div>
                    <div class="match-stat">
                        <span class="match-stat-label">저격</span>
                        <span class="match-stat-value">${p.longestKill}m</span>
                    </div>
                </div>
                ${teammatesHtml}
            </div>`;
    }

    function getTimeAgo(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return '방금 전';
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffHour < 24) return `${diffHour}시간 전`;
        if (diffDay < 7) return `${diffDay}일 전`;
        return date.toLocaleDateString('ko-KR');
    }

    return { init, open, close };
})();
