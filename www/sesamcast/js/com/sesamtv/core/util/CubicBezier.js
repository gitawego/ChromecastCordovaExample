/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true*/
/**
 * JavaScript port of Webkit implementation of CSS cubic-bezier(p1x.p1y,p2x,p2y) by http://mck.me
 * http://svn.webkit.org/repository/webkit/trunk/Source/WebCore/platform/graphics/UnitBezier.h
 */
define(function (CustomEvent) {
    'use strict';
    /**
     * @class com.sesamtv.core.util.CubicBezier
     */
    /**
     * Duration value to use when one is not specified (400ms is a common value).
     * @readonly
     * @type {number}
     */
    var DEFAULT_DURATION = 400;//ms

    /**
     * The epsilon value we pass to UnitBezier::solve given that the animation is going to run over |dur| seconds.
     * The longer the animation, the more precision we need in the timing function result to avoid ugly discontinuities.
     * http://svn.webkit.org/repository/webkit/trunk/Source/WebCore/page/animation/AnimationBase.cpp
     */
    var solveEpsilon = function (duration) {
        return 1.0 / (200.0 * duration);
    };

    /**
     * Defines a cubic-bezier curve given the middle two control points.
     * NOTE: first and last control points are implicitly (0,0) and (1,1).
     * @param p1x {number} X component of control point 1
     * @param p1y {number} Y component of control point 1
     * @param p2x {number} X component of control point 2
     * @param p2y {number} Y component of control point 2
     */
    var unitBezier = function (p1x, p1y, p2x, p2y) {

        // private members --------------------------------------------

        // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).

        /**
         * X component of Bezier coefficient C
         * @readonly
         * @type {number}
         */
        var cx = 3.0 * p1x;

        /**
         * X component of Bezier coefficient B
         * @readonly
         * @type {number}
         */
        var bx = 3.0 * (p2x - p1x) - cx;

        /**
         * X component of Bezier coefficient A
         * @readonly
         * @type {number}
         */
        var ax = 1.0 - cx - bx;

        /**
         * Y component of Bezier coefficient C
         * @readonly
         * @type {number}
         */
        var cy = 3.0 * p1y;

        /**
         * Y component of Bezier coefficient B
         * @readonly
         * @type {number}
         */
        var by = 3.0 * (p2y - p1y) - cy;

        /**
         * Y component of Bezier coefficient A
         * @readonly
         * @type {number}
         */
        var ay = 1.0 - cy - by;

        /**
         * @param t {number} parametric timing value
         * @return {number}
         */
        var sampleCurveX = function (t) {
            // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
            return ((ax * t + bx) * t + cx) * t;
        };

        /**
         * @param t {number} parametric timing value
         * @return {number}
         */
        var sampleCurveY = function (t) {
            return ((ay * t + by) * t + cy) * t;
        };

        /**
         * @param t {number} parametric timing value
         * @return {number}
         */
        var sampleCurveDerivativeX = function (t) {
            return (3.0 * ax * t + 2.0 * bx) * t + cx;
        };

        /**
         * Given an x value, find a parametric value it came from.
         * @param x {number} value of x along the bezier curve, 0.0 <= x <= 1.0
         * @param epsilon {number} accuracy limit of t for the given x
         * @return {number} the t value corresponding to x
         */
        var solveCurveX = function (x, epsilon) {
            var t0;
            var t1;
            var t2;
            var x2;
            var d2;
            var i;

            // First try a few iterations of Newton's method -- normally very fast.
            for (t2 = x, i = 0; i < 8; i++) {
                x2 = sampleCurveX(t2) - x;
                if (Math.abs(x2) < epsilon) {
                    return t2;
                }
                d2 = sampleCurveDerivativeX(t2);
                if (Math.abs(d2) < 1e-6) {
                    break;
                }
                t2 = t2 - x2 / d2;
            }

            // Fall back to the bisection method for reliability.
            t0 = 0.0;
            t1 = 1.0;
            t2 = x;

            if (t2 < t0) {
                return t0;
            }
            if (t2 > t1) {
                return t1;
            }

            while (t0 < t1) {
                x2 = sampleCurveX(t2);
                if (Math.abs(x2 - x) < epsilon) {
                    return t2;
                }
                if (x > x2) {
                    t0 = t2;
                } else {
                    t1 = t2;
                }
                t2 = (t1 - t0) * 0.5 + t0;
            }

            // Failure.
            return t2;
        };

        /**
         * @param x {number} the value of x along the bezier curve, 0.0 <= x <= 1.0
         * @param epsilon {number} the accuracy of t for the given x
         * @return {number} the y value along the bezier curve
         */
        var solve = function (x, epsilon) {
            return sampleCurveY(solveCurveX(x, epsilon));
        };

        // public interface --------------------------------------------

        /**
         * Find the y of the cubic-bezier for a given x with accuracy determined by the animation duration.
         * @param x {number} the value of x along the bezier curve, 0.0 <= x <= 1.0
         * @param duration {number} the duration of the animation in milliseconds
         * @return {number} the y value along the bezier curve
         */
        return function (x, duration) {
            return solve(x, solveEpsilon(+duration || DEFAULT_DURATION));
        };
    };
    var anims = {
        "linear": [0, 0, 1, 1],
        "ease": [0.25, 0.1, 0.25, 1.0],
        "easeIn": [0.42, 0, 1.0, 1.0],
        "easeOut": [0, 0, 0.58, 1.0],
        "easeInOut": [0.42, 0, 0.58, 1.0],
        "easeInQuad": [0.55, 0.085, 0.68, 0.53],
        "easeInCubic": [0.55, 0.055, 0.675, 0.19],
        "easeInQuart": [0.895, 0.03, 0.685, 0.22],
        "easeInQuint": [0.755, 0.05, 0.855, 0.06],
        "easeInSine": [0.47, 0, 0.745, 0.715],
        "easeInExpo": [0.95, 0.05, 0.795, 0.035],
        "easeInCirc": [0.6, 0.04, 0.98, 0.335],
        "easeInBack": [0.6, -0.28, 0.735, 0.045],
        "easeOutQuad": [0.25, 0.46, 0.45, 0.94],
        "easeOutCubic": [0.215, 0.61, 0.355, 1],
        "easeOutQuart": [0.165, 0.84, 0.44, 1],
        "easeOutQuint": [0.23, 1, 0.32, 1],
        "easeOutSine": [0.39, 0.575, 0.565, 1],
        "easeOutExpo": [0.19, 1, 0.22, 1],
        "easeOutCirc": [0.075, 0.82, 0.165, 1],
        "easeOutBack": [0.175, 0.885, 0.32, 1.275],
        "easeInOutQuad": [0.455, 0.03, 0.515, 0.955],
        "easeInOutCubic": [0.645, 0.045, 0.355, 1],
        "easeInOutQuart": [0.77, 0, 0.175, 1],
        "easeInOutQuint": [0.86, 0, 0.07, 1],
        "easeInOutSine": [0.445, 0.05, 0.55, 0.95],
        "easeInOutExpo": [1, 0, 0, 1],
        "easeInOutCirc": [0.785, 0.135, 0.15, 0.86],
        "easeInOutBack": [0.68, -0.55, 0.265, 1.55]
    };
    // http://www.w3.org/TR/css3-transitions/#transition-timing-function
    var CubicBezier = {
        /**
         * @param x {number} the value of x along the bezier curve, 0.0 <= x <= 1.0
         * @param duration {number} the duration of the animation in milliseconds
         * @return {number} the y value along the bezier curve
         */
        linear: unitBezier(0.0, 0.0, 1.0, 1.0),
        /**
         * @param p1x {number} X component of control point 1
         * @param p1y {number} Y component of control point 1
         * @param p2x {number} X component of control point 2
         * @param p2y {number} Y component of control point 2
         * @param x {number} the value of x along the bezier curve, 0.0 <= x <= 1.0
         * @param duration {number} the duration of the animation in milliseconds
         * @return {number} the y value along the bezier curve
         */
        cubicBezier: function (p1x, p1y, p2x, p2y, x, duration) {
            return unitBezier(p1x, p1y, p2x, p2y)(x, duration);
        }
    };
    Object.keys(anims).forEach(function (k) {
        CubicBezier[k] = unitBezier.apply(null, anims[k]);
    }, this);
    return CubicBezier;
});