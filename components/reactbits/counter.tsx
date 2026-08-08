"use client";

import { useEffect, type CSSProperties } from "react";
import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from "motion/react";

import "./counter.css";

type Place = number | ".";

/**
 * Tuned close to critical damping (no bounce/overshoot) so the roll reads as
 * fast-start-then-decelerate rather than a spring wobble.
 */
const DEFAULT_SPRING_CONFIG: SpringOptions = { stiffness: 90, damping: 30, mass: 1 };

function computeDefaultPlaces(value: number): Place[] {
  const chars = [...value.toString()];
  const decimalIndex = chars.indexOf(".");
  return chars.map((ch, i) => {
    if (ch === ".") return ".";
    const exponent =
      decimalIndex === -1
        ? chars.length - i - 1
        : i < decimalIndex
          ? decimalIndex - i - 1
          : -(i - decimalIndex);
    return 10 ** exponent;
  });
}

function normalizeNearInteger(num: number): number {
  const nearest = Math.round(num);
  const tolerance = 1e-9 * Math.max(1, Math.abs(num));
  return Math.abs(num - nearest) < tolerance ? nearest : num;
}

function getValueRoundedToPlace(value: number, place: number): number {
  const scaled = value / place;
  return Math.floor(normalizeNearInteger(scaled));
}

function NumberColumn({
  mv,
  number,
  height,
}: {
  mv: MotionValue<number>;
  number: number;
  height: number;
}) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });
  return (
    <motion.span className="counter-number" style={{ y }}>
      {number}
    </motion.span>
  );
}

function CounterDigit({
  place,
  value,
  height,
  digitStyle,
  springConfig,
}: {
  place: Place;
  value: number;
  height: number;
  digitStyle?: CSSProperties;
  springConfig: SpringOptions;
}) {
  const isDecimal = place === ".";
  const valueRoundedToPlace = isDecimal ? 0 : getValueRoundedToPlace(value, place);
  // Starts at 0 so mounting the component always plays the count-up roll,
  // then settles on `value` (or a later updated value) via the spring above.
  const animatedValue = useSpring(0, springConfig);

  useEffect(() => {
    if (!isDecimal) {
      animatedValue.set(valueRoundedToPlace);
    }
  }, [animatedValue, valueRoundedToPlace, isDecimal]);

  if (isDecimal) {
    return (
      <span className="counter-digit" style={{ height, width: "fit-content", ...digitStyle }}>
        .
      </span>
    );
  }

  return (
    <span className="counter-digit" style={{ height, ...digitStyle }}>
      {Array.from({ length: 10 }, (_, i) => (
        <NumberColumn key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  );
}

export interface CounterProps {
  value: number;
  fontSize?: number;
  padding?: number;
  places?: Place[];
  gap?: number;
  borderRadius?: number;
  horizontalPadding?: number;
  textColor?: string;
  fontWeight?: CSSProperties["fontWeight"];
  containerStyle?: CSSProperties;
  counterStyle?: CSSProperties;
  digitStyle?: CSSProperties;
  gradientHeight?: number;
  gradientFrom?: string;
  gradientTo?: string;
  topGradientStyle?: CSSProperties;
  bottomGradientStyle?: CSSProperties;
  /** Spring physics driving each digit roll. Defaults to a heavily-damped,
   * no-overshoot curve: fast at the start, decelerating into the final value. */
  springConfig?: SpringOptions;
}

export default function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places,
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = "inherit",
  fontWeight = "inherit",
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = "black",
  gradientTo = "transparent",
  topGradientStyle,
  bottomGradientStyle,
  springConfig = DEFAULT_SPRING_CONFIG,
}: CounterProps) {
  const height = fontSize + padding;
  const resolvedPlaces = places ?? computeDefaultPlaces(value);

  const defaultCounterStyle: CSSProperties = {
    fontSize,
    gap,
    borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    color: textColor,
    fontWeight,
    direction: "ltr",
  };
  const defaultTopGradientStyle: CSSProperties = {
    height: gradientHeight,
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
  };
  const defaultBottomGradientStyle: CSSProperties = {
    height: gradientHeight,
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
  };

  return (
    <span className="counter-container" style={containerStyle}>
      <span className="counter-counter" style={{ ...defaultCounterStyle, ...counterStyle }}>
        {resolvedPlaces.map((place, i) => (
          <CounterDigit
            key={`${place}-${i}`}
            place={place}
            value={value}
            height={height}
            digitStyle={digitStyle}
            springConfig={springConfig}
          />
        ))}
      </span>
      <span className="gradient-container">
        <span className="top-gradient" style={topGradientStyle ?? defaultTopGradientStyle} />
        <span
          className="bottom-gradient"
          style={bottomGradientStyle ?? defaultBottomGradientStyle}
        />
      </span>
    </span>
  );
}
