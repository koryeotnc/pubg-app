// 비행경로 모듈
const FlightPath = (function() {
    let map = null;
    let mapConfig = null;

    // 상태
    let state = 'IDLE'; // IDLE, FIRST_POINT, COMPLETE
    let pointA = null;  // 진입점 LatLng
    let pointB = null;  // 퇴출점 LatLng

    // Leaflet 요소들
    let markerA = null;
    let markerB = null;
    let pathLine = null;
    let extendedLines = [];  // 양쪽 연장선 배열
    let planeIcon = null;

    // 콜백
    let onPathChange = null;

    const EXTEND_RATIO = 0.3; // 양쪽으로 30% 연장

    function init(leafletMap, config, callback) {
        map = leafletMap;
        mapConfig = config;
        onPathChange = callback;
    }

    function updateConfig(config) {
        mapConfig = config;
    }

    function activate() {
        if (state !== 'IDLE') return;
        map.getContainer().style.cursor = 'crosshair';
        map.on('click', onMapClick);
        const btn = document.getElementById('btn-flight-path');
        btn.classList.add('active');
        btn.classList.remove('complete');
        document.getElementById('flight-status').textContent = '맵을 클릭하여 비행기 진입 지점을 설정하세요';
    }

    function onMapClick(e) {
        if (state === 'IDLE') {
            pointA = e.latlng;
            markerA = createDraggableMarker(pointA, '#ffcc00', 'A');
            state = 'FIRST_POINT';
            document.getElementById('flight-status').textContent = '비행기 퇴출 지점을 클릭하세요';
        } else if (state === 'FIRST_POINT') {
            pointB = e.latlng;
            markerB = createDraggableMarker(pointB, '#ffcc00', 'B');
            drawPath();
            state = 'COMPLETE';
            map.off('click', onMapClick);
            map.getContainer().style.cursor = '';
            const btn = document.getElementById('btn-flight-path');
            btn.classList.remove('active');
            btn.classList.add('complete');
            document.getElementById('flight-status').textContent = '비행경로 설정 완료 (마커를 드래그하여 조정 가능)';
            notifyChange();
        }
    }

    function createDraggableMarker(latlng, color, label) {
        const icon = L.divIcon({
            className: 'flight-marker',
            html: `<div class="flight-marker-dot" style="background:${color}">${label}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker(latlng, {
            icon: icon,
            draggable: true,
            zIndexOffset: 1000
        }).addTo(map);

        marker.on('drag', function() {
            if (label === 'A') pointA = marker.getLatLng();
            else pointB = marker.getLatLng();
            drawPath();
            notifyChange();
        });

        return marker;
    }

    function drawPath() {
        // 기존 요소 모두 제거
        if (pathLine) map.removeLayer(pathLine);
        extendedLines.forEach(l => map.removeLayer(l));
        extendedLines = [];
        if (planeIcon) map.removeLayer(planeIcon);

        if (!pointA || !pointB) return;

        const a = latLngToXY(pointA);
        const b = latLngToXY(pointB);

        // 연장선 계산
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const extA = { x: a.x - dx * EXTEND_RATIO, y: a.y - dy * EXTEND_RATIO };
        const extB = { x: b.x + dx * EXTEND_RATIO, y: b.y + dy * EXTEND_RATIO };

        // 연장된 부분 (점선) - 배열에 저장
        extendedLines.push(L.polyline([
            xyToLatLng(extA),
            pointA,
        ], {
            color: '#ffcc00',
            weight: 2,
            dashArray: '8, 8',
            opacity: 0.5
        }).addTo(map));

        extendedLines.push(L.polyline([
            pointB,
            xyToLatLng(extB),
        ], {
            color: '#ffcc00',
            weight: 2,
            dashArray: '8, 8',
            opacity: 0.5
        }).addTo(map));

        // 메인 비행경로 (실선)
        pathLine = L.polyline([pointA, pointB], {
            color: '#ffcc00',
            weight: 3,
            opacity: 0.9
        }).addTo(map);

        // 비행기 아이콘 (중간점)
        const midLat = (pointA.lat + pointB.lat) / 2;
        const midLng = (pointA.lng + pointB.lng) / 2;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const planeIconDiv = L.divIcon({
            className: 'plane-icon',
            html: `<div class="plane-icon-inner" style="transform: rotate(${angle - 90}deg)">✈</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        planeIcon = L.marker([midLat, midLng], {
            icon: planeIconDiv,
            interactive: false
        }).addTo(map);
    }

    function notifyChange() {
        if (onPathChange && pointA && pointB) {
            onPathChange(latLngToXY(pointA), latLngToXY(pointB));
        }
    }

    function getPath() {
        if (state !== 'COMPLETE') return null;
        return {
            start: latLngToXY(pointA),
            end: latLngToXY(pointB)
        };
    }

    function isComplete() {
        return state === 'COMPLETE';
    }

    function reset() {
        state = 'IDLE';
        pointA = null;
        pointB = null;
        if (markerA) { map.removeLayer(markerA); markerA = null; }
        if (markerB) { map.removeLayer(markerB); markerB = null; }
        if (pathLine) { map.removeLayer(pathLine); pathLine = null; }
        extendedLines.forEach(l => map.removeLayer(l));
        extendedLines = [];
        if (planeIcon) { map.removeLayer(planeIcon); planeIcon = null; }
        map.off('click', onMapClick);
        map.getContainer().style.cursor = '';
        const btn = document.getElementById('btn-flight-path');
        btn.classList.remove('active', 'complete');
        document.getElementById('flight-status').textContent = '';
        notifyChange();
    }

    return { init, updateConfig, activate, getPath, isComplete, reset };
})();
