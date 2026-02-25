/**
 * @file gps.service.ts
 * @description GPS validation utilities for the physical attendance check-in system.
 *
 * Provides:
 *   - `calculateDistance`    — Haversine great-circle distance in metres
 *   - `validateGpsLocation`  — Full validation with edge-case guards
 *   - `DEFAULT_RADIUS`       — Fallback catchment radius (100 m)
 *
 * Mobile GPS accuracy note
 * ─────────────────────────
 * Consumer smartphone GPS typically has ±3–15 m accuracy outdoors and can
 * degrade to ±30–50 m indoors or in urban canyons. A 10 m buffer is added
 * to the student-side radius to absorb normal GPS noise without enlarging
 * the physical catchment area.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Earth's mean radius in metres (WGS-84 approximation). */
const EARTH_RADIUS_M = 6_371_000;

/**
 * Default catchment radius in metres used when a session has no explicit
 * radius configured.
 */
export const DEFAULT_RADIUS = 100;

/**
 * Extra tolerance added to the student-side comparison to absorb typical
 * consumer-GPS horizontal accuracy error.
 */
const MOBILE_GPS_BUFFER_M = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GpsValidationParams {
    studentLat: number | null | undefined;
    studentLng: number | null | undefined;
    academyLat: number | null | undefined;
    academyLng: number | null | undefined;
    /** Configured catchment radius in metres. Defaults to {@link DEFAULT_RADIUS}. */
    radiusMeters?: number | null;
}

export interface GpsValidationResult {
    valid: boolean;
    /** Haversine distance from student to academy anchor, in metres. */
    distance: number;
    message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. calculateDistance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the great-circle distance between two WGS-84 coordinates using the
 * Haversine formula.
 *
 * Formula
 * ────────
 *   a  = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)
 *   c  = 2 · atan2(√a, √(1-a))
 *   d  = R · c
 *
 * @param lat1 - Latitude of point A in decimal degrees (−90 to +90)
 * @param lng1 - Longitude of point A in decimal degrees (−180 to +180)
 * @param lat2 - Latitude of point B in decimal degrees
 * @param lng2 - Longitude of point B in decimal degrees
 * @returns Distance in metres (≥ 0)
 *
 * @example
 * // Same location → 0 m
 * calculateDistance(30.0444, 31.2357, 30.0444, 31.2357); // → 0
 *
 * @example
 * // Cairo → ~50 m north
 * calculateDistance(30.0444, 31.2357, 30.0449, 31.2357); // → ≈ 55 m
 *
 * @example
 * // Cross-equator: Nairobi (KE) → Dar es Salaam (TZ)
 * calculateDistance(-1.2921, 36.8219, -6.7924, 39.2083); // → ≈ 735 km (735 000 m)
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_M * c; // metres
}

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate range guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns `true` when a latitude value is within the valid WGS-84 range.
 * @param lat - Value to test
 */
function isValidLat(lat: number): boolean {
    return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

/**
 * Returns `true` when a longitude value is within the valid WGS-84 range.
 * @param lng - Value to test
 */
function isValidLng(lng: number): boolean {
    return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. validateGpsLocation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates whether a student's GPS position is within the configured
 * catchment radius of the academy anchor point.
 *
 * A {@link MOBILE_GPS_BUFFER_M | 10 m buffer} is added on top of the
 * configured radius to accommodate typical smartphone GPS horizontal-accuracy
 * error. For example, a session configured with `radiusMeters = 100` will
 * accept students up to 110 m from the anchor.
 *
 * Validation pipeline
 * ────────────────────
 *   1. Null / undefined coordinate guard
 *   2. WGS-84 range guard (lat ∈ [−90, 90], lng ∈ [−180, 180])
 *   3. Haversine distance calculation
 *   4. Distance ≤ (radius + buffer) → valid
 *
 * @param params - Validation input (see {@link GpsValidationParams})
 * @returns {@link GpsValidationResult} with `valid`, raw `distance`, and a
 *   human-readable `message` suitable for API responses.
 *
 * @example
 * // Same location → 0 m → valid at any radius
 * validateGpsLocation({ studentLat: 30.0444, studentLng: 31.2357,
 *                        academyLat: 30.0444, academyLng: 31.2357,
 *                        radiusMeters: 100 });
 * // → { valid: true, distance: 0, message: 'Location verified.' }
 *
 * @example
 * // ~50 m apart → valid at 100 m radius (50 ≤ 100 + 10)
 * validateGpsLocation({ studentLat: 30.0444, studentLng: 31.2357,
 *                        academyLat: 30.0449, academyLng: 31.2357,
 *                        radiusMeters: 100 });
 * // → { valid: true, distance: ≈55, message: 'Location verified.' }
 *
 * @example
 * // ~150 m apart → invalid at 100 m radius (150 > 100 + 10)
 * validateGpsLocation({ studentLat: 30.0444, studentLng: 31.2357,
 *                        academyLat: 30.0458, academyLng: 31.2357,
 *                        radiusMeters: 100 });
 * // → { valid: false, distance: ≈155, message: 'You are 155m away ...' }
 *
 * @example
 * // Cross-equator: Nairobi (KE) → Dar es Salaam (TZ) ≈ 735 km — always invalid
 * validateGpsLocation({ studentLat: -1.2921, studentLng: 36.8219,
 *                        academyLat: -6.7924, academyLng: 39.2083,
 *                        radiusMeters: 100 });
 * // → { valid: false, distance: ≈735000, message: 'You are 735000m away ...' }
 *
 * @example
 * // Missing coordinates
 * validateGpsLocation({ studentLat: null, studentLng: 31.2357,
 *                        academyLat: 30.0444, academyLng: 31.2357 });
 * // → { valid: false, distance: 0, message: 'GPS data missing ...' }
 */
export function validateGpsLocation(params: GpsValidationParams): GpsValidationResult {
    const { studentLat, studentLng, academyLat, academyLng } = params;
    const radius = params.radiusMeters ?? DEFAULT_RADIUS;

    // ── 1. Null / undefined guard ─────────────────────────────────────────────
    if (
        studentLat == null || studentLng == null ||
        academyLat == null || academyLng == null
    ) {
        return {
            valid: false,
            distance: 0,
            message:
                'GPS data missing. Ensure all coordinates are provided and location ' +
                'permissions are granted.',
        };
    }

    // ── 2. WGS-84 range guard ─────────────────────────────────────────────────
    if (!isValidLat(studentLat) || !isValidLng(studentLng)) {
        return {
            valid: false,
            distance: 0,
            message:
                `Student coordinates out of valid range ` +
                `(lat=${studentLat}, lng=${studentLng}). ` +
                `Expected lat ∈ [−90, 90], lng ∈ [−180, 180].`,
        };
    }

    if (!isValidLat(academyLat) || !isValidLng(academyLng)) {
        return {
            valid: false,
            distance: 0,
            message:
                `Academy coordinates are misconfigured ` +
                `(lat=${academyLat}, lng=${academyLng}). ` +
                `Contact your administrator.`,
        };
    }

    if (!Number.isFinite(radius) || radius <= 0) {
        return {
            valid: false,
            distance: 0,
            message: `Invalid radius value (${radius}). Must be a positive number.`,
        };
    }

    // ── 3. Haversine distance ─────────────────────────────────────────────────
    const distance = calculateDistance(studentLat, studentLng, academyLat, academyLng);

    // ── 4. Compare with radius + mobile GPS buffer ────────────────────────────
    const effectiveRadius = radius + MOBILE_GPS_BUFFER_M;
    const valid = distance <= effectiveRadius;

    if (valid) {
        return {
            valid: true,
            distance,
            message: 'Location verified.',
        };
    }

    return {
        valid: false,
        distance,
        message:
            `You are ${Math.round(distance)}m away from the session location. ` +
            `You must be within ${radius}m to check in.`,
    };
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * UNIT TEST EXAMPLES (Jest / Vitest)
 * Copy into __tests__/gps.service.test.ts and run with your test runner.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * import { calculateDistance, validateGpsLocation, DEFAULT_RADIUS } from '../services/gps.service';
 *
 * describe('calculateDistance', () => {
 *
 *   it('same location → 0 metres', () => {
 *     expect(calculateDistance(30.0444, 31.2357, 30.0444, 31.2357)).toBe(0);
 *   });
 *
 *   it('≈50 m apart (northward shift)', () => {
 *     // Δlat ≈ 0.00045° ≈ 50 m at this latitude
 *     const d = calculateDistance(30.0444, 31.2357, 30.04485, 31.2357);
 *     expect(d).toBeGreaterThan(48);
 *     expect(d).toBeLessThan(52);
 *   });
 *
 *   it('≈150 m apart', () => {
 *     const d = calculateDistance(30.0444, 31.2357, 30.04575, 31.2357);
 *     expect(d).toBeGreaterThan(140);
 *     expect(d).toBeLessThan(160);
 *   });
 *
 *   it('cross-equator: Nairobi → Dar es Salaam ≈ 735 km', () => {
 *     const d = calculateDistance(-1.2921, 36.8219, -6.7924, 39.2083);
 *     expect(d).toBeGreaterThan(730_000);
 *     expect(d).toBeLessThan(740_000);
 *   });
 *
 *   it('symmetry: distance(A→B) === distance(B→A)', () => {
 *     const ab = calculateDistance(30.0444, 31.2357, 30.0500, 31.2400);
 *     const ba = calculateDistance(30.0500, 31.2400, 30.0444, 31.2357);
 *     expect(Math.abs(ab - ba)).toBeLessThan(0.001); // float rounding tolerance
 *   });
 * });
 *
 * describe('validateGpsLocation', () => {
 *
 *   const ANCHOR = { academyLat: 30.0444, academyLng: 31.2357 };
 *
 *   it('exact match → valid, distance = 0', () => {
 *     const result = validateGpsLocation({ ...ANCHOR, studentLat: 30.0444, studentLng: 31.2357 });
 *     expect(result.valid).toBe(true);
 *     expect(result.distance).toBe(0);
 *     expect(result.message).toBe('Location verified.');
 *   });
 *
 *   it('≈50 m apart → valid at 100 m radius (50 ≤ 100 + 10 buffer)', () => {
 *     const result = validateGpsLocation({
 *       ...ANCHOR,
 *       studentLat: 30.04485, studentLng: 31.2357,
 *       radiusMeters: 100,
 *     });
 *     expect(result.valid).toBe(true);
 *   });
 *
 *   it('≈150 m apart → invalid at 100 m radius (150 > 110)', () => {
 *     const result = validateGpsLocation({
 *       ...ANCHOR,
 *       studentLat: 30.04575, studentLng: 31.2357,
 *       radiusMeters: 100,
 *     });
 *     expect(result.valid).toBe(false);
 *     expect(result.message).toMatch(/away from/);
 *   });
 *
 *   it('cross-equator: Nairobi → Dar es Salaam → always invalid', () => {
 *     const result = validateGpsLocation({
 *       studentLat: -1.2921, studentLng: 36.8219,
 *       academyLat: -6.7924, academyLng: 39.2083,
 *       radiusMeters: 500,
 *     });
 *     expect(result.valid).toBe(false);
 *     expect(result.distance).toBeGreaterThan(700_000);
 *   });
 *
 *   it('null student coords → GPS data missing', () => {
 *     const result = validateGpsLocation({ ...ANCHOR, studentLat: null, studentLng: null });
 *     expect(result.valid).toBe(false);
 *     expect(result.message).toMatch(/GPS data missing/);
 *     expect(result.distance).toBe(0);
 *   });
 *
 *   it('undefined coords → GPS data missing', () => {
 *     const result = validateGpsLocation({ ...ANCHOR, studentLat: undefined, studentLng: undefined });
 *     expect(result.valid).toBe(false);
 *     expect(result.message).toMatch(/GPS data missing/);
 *   });
 *
 *   it('out-of-range lat (lat=200) → rejection', () => {
 *     const result = validateGpsLocation({ ...ANCHOR, studentLat: 200, studentLng: 31.2357 });
 *     expect(result.valid).toBe(false);
 *     expect(result.message).toMatch(/out of valid range/);
 *   });
 *
 *   it('out-of-range lng (lng=250) → rejection', () => {
 *     const result = validateGpsLocation({ ...ANCHOR, studentLat: 30.0, studentLng: 250 });
 *     expect(result.valid).toBe(false);
 *     expect(result.message).toMatch(/out of valid range/);
 *   });
 *
 *   it('defaults to DEFAULT_RADIUS when radiusMeters is omitted', () => {
 *     expect(DEFAULT_RADIUS).toBe(100);
 *     // A student 5 m away → valid under the default 100 m + 10 m buffer
 *     const result = validateGpsLocation({
 *       ...ANCHOR,
 *       studentLat: 30.044445, studentLng: 31.2357,
 *       // radiusMeters intentionally omitted
 *     });
 *     expect(result.valid).toBe(true);
 *   });
 * });
 */
