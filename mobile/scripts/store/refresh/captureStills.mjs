/**
 * Entry point named in the refresh-2026-09 brief (section 2, "Scripts").
 * The capture step lives in scripts/store/captureRefresh.mjs; this forwards
 * to it with the same arguments, e.g. `node scripts/store/refresh/captureStills.mjs s01 t2`.
 */
import '../captureRefresh.mjs';
