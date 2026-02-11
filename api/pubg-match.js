const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE = 'https://api.pubg.com';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!PUBG_API_KEY) return res.status(500).json({ error: 'PUBG_API_KEY not configured' });

    const { id, shard = 'kakao', playerId } = req.query;
    if (!id) return res.status(400).json({ error: 'id parameter required' });

    const headers = {
        'Authorization': `Bearer ${PUBG_API_KEY}`,
        'Accept': 'application/vnd.api+json'
    };

    try {
        const matchRes = await fetch(`${PUBG_BASE}/shards/${shard}/matches/${id}`, { headers });

        if (!matchRes.ok) {
            return res.status(matchRes.status).json({ error: `Match API error: ${matchRes.status}` });
        }

        const matchData = await matchRes.json();
        const attrs = matchData.data.attributes;
        const included = matchData.included || [];

        // 참가자, 로스터 분류
        const participants = included.filter(i => i.type === 'participant');
        const rosters = included.filter(i => i.type === 'roster');

        // 검색한 플레이어 찾기
        let targetParticipant = null;
        if (playerId) {
            targetParticipant = participants.find(p => {
                try {
                    return p.attributes.stats.playerId === playerId;
                } catch (e) {
                    return false;
                }
            });
        }

        // 타겟의 로스터 찾기
        let targetRoster = null;
        let rosterParticipants = [];

        if (targetParticipant) {
            // roster 관계 찾기 — relationships 구조가 다를 수 있으므로 안전하게 접근
            const rosterRef = targetParticipant.relationships && targetParticipant.relationships.roster
                && targetParticipant.relationships.roster.data;

            if (rosterRef) {
                const rosterId = rosterRef.id;
                targetRoster = rosters.find(r => r.id === rosterId);
            } else {
                // roster 관계가 없으면 직접 rosters에서 해당 participant를 포함하는 것을 찾기
                targetRoster = rosters.find(r =>
                    r.relationships && r.relationships.participants &&
                    r.relationships.participants.data &&
                    r.relationships.participants.data.some(p => p.id === targetParticipant.id)
                );
            }

            if (targetRoster && targetRoster.relationships && targetRoster.relationships.participants) {
                const rosterParticipantIds = targetRoster.relationships.participants.data.map(p => p.id);
                rosterParticipants = participants
                    .filter(p => rosterParticipantIds.includes(p.id))
                    .map(p => ({
                        name: p.attributes.stats.name,
                        playerId: p.attributes.stats.playerId,
                        kills: p.attributes.stats.kills,
                        assists: p.attributes.stats.assists,
                        damageDealt: Math.round(p.attributes.stats.damageDealt),
                        DBNOs: p.attributes.stats.DBNOs
                    }));
            }
        }

        const playerStats = targetParticipant ? targetParticipant.attributes.stats : null;

        return res.status(200).json({
            matchId: matchData.data.id,
            createdAt: attrs.createdAt,
            gameMode: attrs.gameMode,
            mapName: attrs.mapName,
            duration: attrs.duration,
            isRanked: attrs.matchType === 'competitive',
            player: playerStats ? {
                name: playerStats.name,
                kills: playerStats.kills,
                assists: playerStats.assists,
                damageDealt: Math.round(playerStats.damageDealt),
                DBNOs: playerStats.DBNOs,
                winPlace: playerStats.winPlace,
                longestKill: Math.round(playerStats.longestKill),
                timeSurvived: playerStats.timeSurvived,
                walkDistance: Math.round(playerStats.walkDistance),
                rideDistance: Math.round(playerStats.rideDistance),
                headshotKills: playerStats.headshotKills,
                revives: playerStats.revives
            } : null,
            roster: targetRoster ? {
                rank: targetRoster.attributes.stats.rank,
                participants: rosterParticipants
            } : null,
            totalTeams: rosters.length
        });

    } catch (err) {
        console.error('Match API proxy error:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다', detail: err.message });
    }
};
