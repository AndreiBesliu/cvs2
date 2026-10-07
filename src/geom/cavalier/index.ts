// Public API barrel.
//
// The two bare imports below are REQUIRED side-effect imports: evaluating those modules
// registers the parallel-offset and boolean implementations into the dispatch registries
// used by PlineSourceBase (an indirection that breaks an otherwise-fatal ESM import cycle
// through plineView). package.json declares "sideEffects": true so bundlers never
// tree-shake the registration away (glob-based sideEffects arrays proved unreliable for
// symlinked file: dependencies under Vite/Rollup).
import "./polyline/internal/plineOffset.ts";
import "./polyline/internal/plineBoolean.ts";

export * from "./core/fuzzy.ts";
export * from "./core/controlFlow.ts";
export * from "./core/mathUtils.ts";
export * from "./core/vector2.ts";
export * from "./core/lineLineIntersect.ts";
export * from "./core/lineCircleIntersect.ts";
export * from "./core/circleCircleIntersect.ts";
export * from "./index2d/staticAabb2dIndex.ts";
export * from "./polyline/plineVertex.ts";
export * from "./polyline/plineSeg.ts";
export * from "./polyline/plineSegIntersect.ts";
export * from "./polyline/plineTypes.ts";
export * from "./polyline/plineSourceBase.ts";
export * from "./polyline/polyline.ts";
export * from "./polyline/plineView.ts";
export * from "./polyline/construct.ts";
// note: importing this module also registers the `parallelOffset` implementation used by
// `PlineSourceBase.parallelOffset`/`parallelOffsetOpt` (see `plineOffsetRegistry.ts`)
export * from "./polyline/internal/plineOffset.ts";
// note: importing this module also registers the `polylineBoolean` implementation used by
// `PlineSourceBase.boolean`/`booleanOpt` (see `booleanDispatch.ts`)
export * from "./polyline/internal/plineBoolean.ts";
export * from "./shape/shape.ts";
