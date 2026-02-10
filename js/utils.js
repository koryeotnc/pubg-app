// 유틸리티 함수들

// CRS.Simple에서 maxZoom=5일 때의 스케일 팩터
// 픽셀 → LatLng 변환: latlng = pixel / 2^maxZoom = pixel / 32
const LATLNG_SCALE = 32; // 2^5

/**
 * 직선과 원의 교점을 구합니다.
 * 모든 좌표는 LatLng 단위입니다.
 * @param {Object} p1 - 직선 시작점 {x, y} (LatLng 단위: lng, lat)
 * @param {Object} p2 - 직선 끝점 {x, y}
 * @param {Object} center - 원 중심 {x, y}
 * @param {number} radius - 원 반지름 (LatLng 단위)
 * @returns {Array} 교점 배열 [{x, y, t}, ...]
 */
function findLineCircleIntersections(p1, p2, center, radius) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - center.x;
    const fy = p1.y - center.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;

    let discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return [];
    }

    const intersections = [];
    discriminant = Math.sqrt(discriminant);

    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    // 비행경로 선분 + 연장선 허용 범위
    if (t1 >= -0.3 && t1 <= 1.3) {
        intersections.push({
            x: p1.x + t1 * dx,
            y: p1.y + t1 * dy,
            t: t1
        });
    }

    if (Math.abs(discriminant) > 0.001 && t2 >= -0.3 && t2 <= 1.3) {
        intersections.push({
            x: p1.x + t2 * dx,
            y: p1.y + t2 * dy,
            t: t2
        });
    }

    return intersections;
}

/**
 * 미터를 LatLng 단위로 변환합니다.
 * @param {number} meters - 거리 (미터)
 * @param {Object} mapConfig - 맵 설정
 * @returns {number} LatLng 단위 거리
 */
function metersToLatLng(meters, mapConfig) {
    const pixels = meters * mapConfig.pixelsPerMeter;
    return pixels / LATLNG_SCALE;
}

/**
 * LatLng 단위를 미터로 변환합니다.
 * @param {number} latlngDist - 거리 (LatLng 단위)
 * @param {Object} mapConfig - 맵 설정
 * @returns {number} 미터 단위 거리
 */
function latLngToMeters(latlngDist, mapConfig) {
    const pixels = latlngDist * LATLNG_SCALE;
    return pixels / mapConfig.pixelsPerMeter;
}

/**
 * 두 점 사이의 거리를 구합니다 (LatLng 단위).
 */
function distanceBetween(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Leaflet LatLng를 {x, y} 객체로 변환합니다.
 * CRS.Simple에서 lng=x, lat=y
 */
function latLngToXY(latlng) {
    return { x: latlng.lng, y: latlng.lat };
}

/**
 * {x, y}를 Leaflet LatLng로 변환합니다.
 */
function xyToLatLng(point) {
    return L.latLng(point.y, point.x);
}

/**
 * LatLng 좌표를 게임 좌표(미터)로 변환합니다.
 * CRS.Simple에서 lat은 음수(위쪽이 0, 아래쪽이 -256)
 * lng은 0~256
 */
function latLngToGameCoords(lat, lng, mapConfig) {
    // LatLng 전체 범위: imageSize / LATLNG_SCALE (8192/32=256)
    const totalLatLng = mapConfig.imageSize / LATLNG_SCALE;
    // lng → 게임 X (0~sizeMeters)
    const gameX = (lng / totalLatLng) * mapConfig.sizeMeters;
    // lat → 게임 Y (lat은 0에서 -totalLatLng, 위→아래)
    const gameY = (-lat / totalLatLng) * mapConfig.sizeMeters;
    return { x: Math.round(gameX), y: Math.round(gameY) };
}

// 하위 호환용 (app.js의 마우스 좌표 표시에서 사용)
function pixelToGameCoords(px, py, mapConfig) {
    return latLngToGameCoords(-py, px, mapConfig);
}

/**
 * 비행경로상의 거리를 시간으로 변환합니다.
 * @param {number} distMeters - 거리 (미터)
 * @returns {number} 시간 (초)
 */
function distanceToFlightTime(distMeters) {
    return distMeters / PLANE_SPEED;
}
