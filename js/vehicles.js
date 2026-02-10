// 차량 스폰 오버레이 모듈
const Vehicles = (function() {
    let map = null;
    let mapConfig = null;
    let vehicleData = null;
    let layerGroup = null;
    let visible = false;
    let activeFilters = new Set(['road', 'garage', 'water']);

    // XOR 디코딩 키 및 오프셋 테이블 (battlegrounds.party 형식)
    const XOR_KEY = 3122512141;
    const OFFSET_TABLE = [201029, 255880, 315876, 196809, 282172, 270304, 50578, 234400, 331944, 111170];

    // 그룹 카테고리 매핑
    const GROUP_CATEGORIES = {
        'EThingSpotGroupType::GroupA': { category: 'road',        nameKr: '도로 차량',     color: '#4CAF50' },
        'EThingSpotGroupType::GroupB': { category: 'start',       nameKr: '시작 지역 차량', color: '#FF9800' },
        'EThingSpotGroupType::GroupC': { category: 'garage',      nameKr: '차고 차량',     color: '#2196F3' },
        'EThingSpotGroupType::GroupE': { category: 'water',       nameKr: '수상 차량',     color: '#00BCD4' },
        'EThingSpotGroupType::GroupG': { category: 'motorglider', nameKr: '모터 글라이더',  color: '#E91E63' },
        'EThingSpotGroupType::GroupL': { category: 'brdm',        nameKr: 'BRDM',         color: '#795548' },
    };

    function init(leafletMap, config) {
        map = leafletMap;
        mapConfig = config;
        layerGroup = L.layerGroup();
    }

    function updateConfig(config) {
        mapConfig = config;
    }

    async function loadData(mapId) {
        vehicleData = null;
        clearMarkers();

        const codename = mapConfig.codename;

        try {
            const spotsResp = await fetch(`https://battlegrounds.party/map/data/${codename}/vehicleSpots-condensed.json?352747a17877`);
            const vehiclesResp = await fetch(`https://battlegrounds.party/map/data/${codename}/vehicles.json?352747a17877`);

            if (!spotsResp.ok || !vehiclesResp.ok) {
                console.warn(`차량 데이터를 로드할 수 없습니다: ${mapId}`);
                return;
            }

            const spots = await spotsResp.json();
            const vehicles = await vehiclesResp.json();

            vehicleData = { spots, vehicles };

            if (visible) {
                renderMarkers();
            }
        } catch (err) {
            console.warn('차량 데이터 로드 실패:', err);
        }
    }

    // XOR 디코딩: Int32 → 디코딩된 값
    function xorDecode(rawVal) {
        return (XOR_KEY ^ rawVal) / 10;
    }

    // condensed 좌표를 맵 픽셀 좌표로 변환
    function decodeCoords(rawX, rawY) {
        const decodedX = xorDecode(rawX);
        const decodedY = xorDecode(rawY);

        // 디코딩된 X로 오프셋 인덱스 계산
        const k = Math.floor(((10 * decodedX) % 10 + 10) % 10);

        // 게임 좌표로 디오브퍼스케이션
        const gameX = (decodedX - 42044) / 0.788;
        const gameY = (decodedY - 42044 + OFFSET_TABLE[k]) / 0.788;

        // 픽셀 좌표로 변환 (sizeScale 적용)
        const sizeScale = mapConfig.sizeScale || 1;
        const pixelX = gameX / 100 / sizeScale;
        const pixelY = gameY / 100 / sizeScale;

        return { px: pixelX, py: pixelY };
    }

    function renderMarkers() {
        clearMarkers();
        if (!vehicleData || !vehicleData.spots) return;

        const spots = vehicleData.spots;
        const vehicleInfo = vehicleData.vehicles;
        const size = mapConfig.imageSize;

        for (const [groupType, positions] of Object.entries(spots)) {
            const groupMeta = GROUP_CATEGORIES[groupType];
            if (!groupMeta) continue;
            if (!activeFilters.has(groupMeta.category)) continue;

            const color = groupMeta.color;
            const categoryName = groupMeta.nameKr;

            let vehicleNames = '';
            if (vehicleInfo[groupType] && vehicleInfo[groupType].vehicles) {
                vehicleNames = Object.keys(vehicleInfo[groupType].vehicles).join(', ');
            }

            positions.forEach(([rawX, rawY]) => {
                const { px, py } = decodeCoords(rawX, rawY);

                // 범위 밖인 경우 스킵
                if (px < -100 || px > size + 100 || py < -100 || py > size + 100) return;
                if (isNaN(px) || isNaN(py)) return;

                // 픽셀 좌표를 Leaflet LatLng로 변환
                // CRS.Simple에서: lng = px / 32, lat = -py / 32
                const latlng = L.latLng(-py / LATLNG_SCALE, px / LATLNG_SCALE);

                const marker = L.circleMarker(latlng, {
                    radius: 4,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.7,
                    weight: 1
                });

                marker.bindPopup(`
                    <div class="vehicle-popup">
                        <strong>${categoryName}</strong><br>
                        ${vehicleNames ? `차량: ${vehicleNames}` : ''}
                    </div>
                `, { className: 'dark-popup' });

                layerGroup.addLayer(marker);
            });
        }

        layerGroup.addTo(map);
    }

    function clearMarkers() {
        layerGroup.clearLayers();
        if (map.hasLayer(layerGroup)) {
            map.removeLayer(layerGroup);
        }
    }

    function show() {
        visible = true;
        if (vehicleData) {
            renderMarkers();
        }
    }

    function hide() {
        visible = false;
        clearMarkers();
    }

    function toggle() {
        if (visible) hide();
        else show();
    }

    function setFilter(category, enabled) {
        if (enabled) activeFilters.add(category);
        else activeFilters.delete(category);
        if (visible) renderMarkers();
    }

    function reset() {
        hide();
        vehicleData = null;
    }

    return { init, updateConfig, loadData, show, hide, toggle, setFilter, reset };
})();
