// 낙하산 계산기 모듈 (다중 반경 지원)
const Parachute = (function() {
    let map = null;
    let mapConfig = null;

    // 상태
    let active = false;
    let landingPoint = null;   // LatLng
    let radiusValues = [1000]; // 선택된 거리 배열 (기본 1000m)

    // Leaflet 요소들
    let landingMarker = null;
    let radiusCircles = [];        // 거리별 원 배열
    let intersectionMarkers = [];
    let glideLines = [];

    // 비행경로 참조
    let getFlightPath = null;

    // 거리별 색상 (반복 사용)
    const DISTANCE_COLORS = [
        '#00ff88', '#00ccff', '#ffaa00', '#ff66aa', '#aa66ff',
        '#66ffcc', '#ff6644', '#44aaff', '#ffcc00', '#ff44aa', '#66ff66'
    ];

    function init(leafletMap, config, flightPathGetter) {
        map = leafletMap;
        mapConfig = config;
        getFlightPath = flightPathGetter;
    }

    function updateConfig(config) {
        mapConfig = config;
    }

    function activate() {
        active = true;
        map.getContainer().style.cursor = 'crosshair';
        map.on('click', onMapClick);
        const btn = document.getElementById('btn-landing');
        btn.classList.add('active');
        btn.classList.remove('complete');
        document.getElementById('parachute-status').textContent = '착지 지점을 클릭하세요';
    }

    function deactivate() {
        active = false;
        map.off('click', onMapClick);
        map.getContainer().style.cursor = '';
    }

    function onMapClick(e) {
        if (!active) return;

        landingPoint = e.latlng;

        // 기존 마커 제거
        if (landingMarker) map.removeLayer(landingMarker);

        // 착지 마커 생성
        const icon = L.divIcon({
            className: 'landing-marker',
            html: '<div class="landing-marker-dot">🎯</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        landingMarker = L.marker(landingPoint, {
            icon: icon,
            draggable: true,
            zIndexOffset: 900
        }).addTo(map);

        landingMarker.on('drag', function() {
            landingPoint = landingMarker.getLatLng();
            updateCircleAndIntersections();
        });

        updateCircleAndIntersections();
        deactivate();
        const btn = document.getElementById('btn-landing');
        btn.classList.remove('active');
        btn.classList.add('complete');
        document.getElementById('parachute-status').textContent = '착지 지점 설정 완료 (드래그하여 조정 가능)';
    }

    // 다중 반경 설정 (배열)
    function setRadiusValues(values) {
        radiusValues = values.length > 0 ? values.sort((a, b) => a - b) : [];
        updateCircleAndIntersections();
    }

    // 하위 호환: 단일 반경 설정
    function setRadius(meters) {
        radiusValues = [meters];
        updateCircleAndIntersections();
    }

    function updateCircleAndIntersections() {
        clearVisuals();

        if (!landingPoint || !mapConfig || radiusValues.length === 0) return;

        const center = latLngToXY(landingPoint);
        const path = getFlightPath();

        let allResults = [];

        radiusValues.forEach((meters, idx) => {
            const radiusLatLng = metersToLatLng(meters, mapConfig);
            const colorIdx = idx % DISTANCE_COLORS.length;
            const color = DISTANCE_COLORS[colorIdx];

            // 반경 원 그리기
            const circle = L.circle(landingPoint, {
                radius: radiusLatLng,
                color: color,
                fillColor: color,
                fillOpacity: 0.05,
                weight: 2,
                dashArray: '6, 4'
            }).addTo(map);

            radiusCircles.push(circle);

            // 원 위에 거리 라벨 표시 (상단)
            const labelLatLng = L.latLng(landingPoint.lat + radiusLatLng, landingPoint.lng);
            const distLabel = L.marker(labelLatLng, {
                icon: L.divIcon({
                    className: 'grid-label',
                    html: `<span style="color:${color}; font-weight:500;">${meters}m</span>`,
                    iconSize: [50, 14],
                    iconAnchor: [25, 14]
                }),
                interactive: false
            }).addTo(map);
            intersectionMarkers.push(distLabel);

            // 비행경로와 교점 계산
            if (!path) return;

            const intersections = findLineCircleIntersections(
                path.start, path.end, center, radiusLatLng
            );

            intersections.forEach((pt) => {
                const latlng = xyToLatLng(pt);

                const icon = L.divIcon({
                    className: 'jump-marker',
                    html: `<div class="jump-marker-dot" style="background:${color}; box-shadow: 0 0 12px ${color}99;">J</div>`,
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                });

                const marker = L.marker(latlng, {
                    icon: icon,
                    zIndexOffset: 800
                }).addTo(map);

                intersectionMarkers.push(marker);

                // 교점에서 착지 지점까지 점선
                const glideLine = L.polyline([latlng, landingPoint], {
                    color: color,
                    weight: 2,
                    dashArray: '4, 6',
                    opacity: 0.6
                }).addTo(map);

                glideLines.push(glideLine);

                // 결과 정보 수집
                const distFromStart = distanceBetween(path.start, pt);
                const distFromStartMeters = latLngToMeters(distFromStart, mapConfig);
                const flightTime = distanceToFlightTime(distFromStartMeters);

                const distToLanding = distanceBetween(pt, center);
                const distToLandingMeters = latLngToMeters(distToLanding, mapConfig);

                const gameCoords = latLngToGameCoords(pt.y, pt.x, mapConfig);

            });
        });
    }

    function clearVisuals() {
        radiusCircles.forEach(c => map.removeLayer(c));
        radiusCircles = [];
        intersectionMarkers.forEach(m => map.removeLayer(m));
        intersectionMarkers = [];
        glideLines.forEach(l => map.removeLayer(l));
        glideLines = [];
    }

    function onFlightPathChange() {
        if (landingPoint) {
            updateCircleAndIntersections();
        }
    }

    function reset() {
        clearVisuals();
        if (landingMarker) { map.removeLayer(landingMarker); landingMarker = null; }
        landingPoint = null;
        active = false;
        map.off('click', onMapClick);
        map.getContainer().style.cursor = '';
        const btn = document.getElementById('btn-landing');
        btn.classList.remove('active', 'complete');
        document.getElementById('parachute-status').textContent = '';
    }

    return { init, updateConfig, activate, deactivate, setRadius, setRadiusValues, onFlightPathChange, reset };
})();
