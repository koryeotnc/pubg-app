const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE = 'https://api.pubg.com';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!PUBG_API_KEY) return res.status(500).json({ error: 'PUBG_API_KEY not configured' });

    const { name, platform = 'kakao' } = req.query;
    if (!name) return res.status(400).json({ error: 'name parameter required' });

    const shard = platform === 'steam' ? 'steam' : 'kakao';
    const headers = {
        'Authorization': `Bearer ${PUBG_API_KEY}`,
        'Accept': 'application/vnd.api+json'
    };

    try {
        // Step 1: Find player by name
        const playerRes = await fetch(
            `${PUBG_BASE}/shards/${shard}/players?filter[playerNames]=${encodeURIComponent(name)}`,
            { headers }
        );

        if (playerRes.status === 404) return res.status(404).json({ error: '플레이어를 찾을 수 없습니다' });
        if (playerRes.status === 429) return res.status(429).json({ error: 'API 요청 한도 초과. 잠시 후 다시 시도해주세요' });
        if (!playerRes.ok) return res.status(playerRes.status).json({ error: `PUBG API error: ${playerRes.status}` });

        const playerData = await playerRes.json();
        const player = playerData.data && playerData.data[0];
        if (!player) return res.status(404).json({ error: '플레이어를 찾을 수 없습니다' });

        const playerId = player.id;
        const playerName = player.attributes.name;

        // 최근 매치 ID 목록 추출
        const matchIds = (player.relationships && player.relationships.matches && player.relationships.matches.data)
            ? player.relationships.matches.data.map(m => m.id)
            : [];

        // Step 2: Get current season
        const seasonsRes = await fetch(`${PUBG_BASE}/shards/${shard}/seasons`, { headers });
        if (!seasonsRes.ok) return res.status(500).json({ error: '시즌 정보를 가져올 수 없습니다' });

        const seasonsData = await seasonsRes.json();
        const currentSeason = seasonsData.data.find(s => s.attributes.isCurrentSeason);
        if (!currentSeason) return res.status(500).json({ error: '현재 시즌을 찾을 수 없습니다' });

        const seasonId = currentSeason.id;

        // Step 3: Get season stats (normal) + ranked stats in parallel
        const [normalRes, rankedRes] = await Promise.all([
            fetch(`${PUBG_BASE}/shards/${shard}/players/${playerId}/seasons/${seasonId}`, { headers }),
            fetch(`${PUBG_BASE}/shards/${shard}/players/${playerId}/seasons/${seasonId}/ranked`, { headers })
        ]);

        let normalModes = {};
        let rankedModes = {};

        // Parse normal stats
        if (normalRes.ok) {
            const normalData = await normalRes.json();
            const gameModeStats = normalData.data.attributes.gameModeStats;
            normalModes = extractModeStats(gameModeStats);
        }

        // Parse ranked stats
        if (rankedRes.ok) {
            const rankedData = await rankedRes.json();
            const rankedGameModeStats = rankedData.data.attributes.rankedGameModeStats;
            if (rankedGameModeStats) {
                rankedModes = extractRankedStats(rankedGameModeStats);
            }
        }

        return res.status(200).json({
            name: playerName,
            playerId,
            platform: shard,
            seasonId,
            normal: normalModes,
            ranked: rankedModes,
            matchIds
        });

    } catch (err) {
        console.error('PUBG API proxy error:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
};

function extractModeStats(gameModeStats) {
    const modes = {};
    const modeKeys = ['solo', 'solo-fpp', 'duo', 'duo-fpp', 'squad', 'squad-fpp'];

    for (const mode of modeKeys) {
        const s = gameModeStats[mode];
        if (!s || s.roundsPlayed === 0) continue;

        modes[mode] = {
            roundsPlayed: s.roundsPlayed,
            wins: s.wins,
            kills: s.kills,
            deaths: s.losses,
            assists: s.assists,
            damageDealt: s.damageDealt,
            top10s: s.top10s,
            headshotKills: s.headshotKills,
            longestKill: s.longestKill,
            maxKillStreaks: s.maxKillStreaks,
            kd: s.losses > 0 ? (s.kills / s.losses).toFixed(2) : s.kills.toFixed(2),
            winRate: ((s.wins / s.roundsPlayed) * 100).toFixed(1),
            top10Rate: ((s.top10s / s.roundsPlayed) * 100).toFixed(1),
            avgDamage: (s.damageDealt / s.roundsPlayed).toFixed(0),
            headshotRate: s.kills > 0 ? ((s.headshotKills / s.kills) * 100).toFixed(1) : '0.0'
        };
    }
    return modes;
}

function extractRankedStats(rankedGameModeStats) {
    const modes = {};
    const modeKeys = ['solo', 'solo-fpp', 'duo', 'duo-fpp', 'squad', 'squad-fpp'];

    for (const mode of modeKeys) {
        const s = rankedGameModeStats[mode];
        if (!s || s.roundsPlayed === 0) continue;

        modes[mode] = {
            roundsPlayed: s.roundsPlayed,
            wins: s.wins,
            kills: s.kills,
            deaths: s.deaths,
            assists: s.assists,
            damageDealt: s.damageDealt,
            top10s: s.top10s || 0,
            kda: s.kda ? s.kda.toFixed(2) : ((s.kills + s.assists) / Math.max(s.deaths, 1)).toFixed(2),
            kd: s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2),
            winRate: ((s.wins / s.roundsPlayed) * 100).toFixed(1),
            top10Rate: s.top10s ? ((s.top10s / s.roundsPlayed) * 100).toFixed(1) : '-',
            avgDamage: s.damageDealt > 0 ? (s.damageDealt / s.roundsPlayed).toFixed(0) : '0',
            avgRank: s.avgRank ? s.avgRank.toFixed(1) : '-',
            tier: s.currentTier ? s.currentTier.tier : null,
            subTier: s.currentTier ? s.currentTier.subTier : null,
            rankPoint: s.currentRankPoint || 0
        };
    }
    return modes;
}
