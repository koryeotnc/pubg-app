const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE = 'https://api.pubg.com';

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!PUBG_API_KEY) {
        return res.status(500).json({ error: 'PUBG_API_KEY not configured' });
    }

    const { name, platform = 'kakao' } = req.query;

    if (!name) {
        return res.status(400).json({ error: 'name parameter required' });
    }

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

        if (playerRes.status === 404) {
            return res.status(404).json({ error: '플레이어를 찾을 수 없습니다' });
        }
        if (playerRes.status === 429) {
            return res.status(429).json({ error: 'API 요청 한도 초과. 잠시 후 다시 시도해주세요' });
        }
        if (!playerRes.ok) {
            return res.status(playerRes.status).json({ error: `PUBG API error: ${playerRes.status}` });
        }

        const playerData = await playerRes.json();
        const player = playerData.data && playerData.data[0];

        if (!player) {
            return res.status(404).json({ error: '플레이어를 찾을 수 없습니다' });
        }

        const playerId = player.id;
        const playerName = player.attributes.name;

        // Step 2: Get lifetime stats
        const statsRes = await fetch(
            `${PUBG_BASE}/shards/${shard}/players/${playerId}/seasons/lifetime`,
            { headers }
        );

        if (!statsRes.ok) {
            return res.status(statsRes.status).json({ error: `Stats API error: ${statsRes.status}` });
        }

        const statsData = await statsRes.json();
        const gameModeStats = statsData.data.attributes.gameModeStats;

        // Extract stats for all modes
        const modes = {};
        const modeKeys = ['solo', 'solo-fpp', 'duo', 'duo-fpp', 'squad', 'squad-fpp'];

        for (const mode of modeKeys) {
            const s = gameModeStats[mode];
            if (!s || s.roundsPlayed === 0) continue;

            modes[mode] = {
                roundsPlayed: s.roundsPlayed,
                wins: s.wins,
                kills: s.kills,
                deaths: s.losses, // losses = deaths in PUBG API
                assists: s.assists,
                damageDealt: s.damageDealt,
                top10s: s.top10s,
                headshotKills: s.headshotKills,
                longestKill: s.longestKill,
                maxKillStreaks: s.maxKillStreaks,
                suicides: s.suicides,
                teamKills: s.teamKills,
                timeSurvived: s.timeSurvived,
                // Calculated
                kd: s.losses > 0 ? (s.kills / s.losses).toFixed(2) : s.kills.toFixed(2),
                winRate: ((s.wins / s.roundsPlayed) * 100).toFixed(1),
                top10Rate: ((s.top10s / s.roundsPlayed) * 100).toFixed(1),
                avgDamage: (s.damageDealt / s.roundsPlayed).toFixed(0),
                headshotRate: s.kills > 0 ? ((s.headshotKills / s.kills) * 100).toFixed(1) : '0.0'
            };
        }

        return res.status(200).json({
            name: playerName,
            playerId,
            platform: shard,
            modes
        });

    } catch (err) {
        console.error('PUBG API proxy error:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
};
