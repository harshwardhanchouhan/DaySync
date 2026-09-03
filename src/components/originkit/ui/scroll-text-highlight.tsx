"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export type SplitBy = "characters" | "words";

export type ScrollHighlightProps = {
  text?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  style?: React.CSSProperties;
  font?: React.CSSProperties;

  /** Color at the start of scroll (progress = 0) */
  initialColor?: string;
  /** Color at the end of scroll (progress = 1) */
  targetColor?: string;
  /** Backwards-compatible alias for initialColor */
  dimColor?: string;
  /** Backwards-compatible alias for targetColor */
  highlightColor?: string;

  splitBy?: SplitBy;
  scrollStart?: string;
  scrollEnd?: string;
  scrub?: boolean | number;
  padding?: string;
};

const CHAR_STAGGER = 0.03;
const WORD_STAGGER = 0.08;

export function ScrollHighlight({
  text = "",
  as = "span",
  className = "",
  style,
  font,

  initialColor,
  targetColor,
  dimColor,
  highlightColor,

  splitBy = "words",
  scrollStart = "top 80%",
  scrollEnd = "top 35%",
  scrub = true,
  padding = "0",
}: ScrollHighlightProps) {
  const containerRef = useRef<HTMLElement>(null);
  const words = text ? text.trim().split(/\s+/).filter(Boolean) : [];
  const chars = text ? Array.from(text) : [];
  const stagger = splitBy === "characters" ? CHAR_STAGGER : WORD_STAGGER;

  const fromColor = initialColor ?? dimColor ?? "#A4A49F";
  const toColor = targetColor ?? highlightColor ?? "#20201F";

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !text) return;

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = el.querySelectorAll(
      splitBy === "characters" ? ".char" : ".word"
    );

    if (isReducedMotion) {
      const readableColor = fromColor !== "#A4A49F" ? fromColor : toColor;
      gsap.set(targets, { color: readableColor });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(targets, {
        color: fromColor,
      });

      gsap.to(targets, {
        color: toColor,
        stagger,
        scrollTrigger: {
          trigger: el,
          start: scrollStart,
          end: scrollEnd,
          scrub,
          invalidateOnRefresh: true,
        },
      });
    }, el);

    // Refresh after DOM and fonts settle
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [
    text,
    fromColor,
    toColor,
    splitBy,
    stagger,
    scrollStart,
    scrollEnd,
    scrub,
  ]);

  const Tag = as as React.ElementType;

  const content =
    splitBy === "characters"
      ? chars.map((char, index) => {
          if (char === " ") {
            return (
              <span
                key={`space-${index}`}
                className="char"
                style={{ display: "inline", color: fromColor }}
              >
                {" "}
              </span>
            );
          }
          return (
            <span
              key={`${char}-${index}`}
              className="char"
              style={{
                display: "inline-block",
                color: fromColor,
              }}
            >
              {char}
            </span>
          );
        })
      : words.map((word, index) => (
          <React.Fragment key={`${word}-${index}`}>
            <span
              className="word"
              style={{
                display: "inline-block",
                color: fromColor,
              }}
            >
              {word}
            </span>
            {index < words.length - 1 ? " " : null}
          </React.Fragment>
        ));

  if (padding && padding !== "0") {
    return (
      <div style={{ paddingTop: padding, paddingBottom: padding }}>
        <Tag
          ref={containerRef}
          className={className}
          style={{
            margin: 0,
            color: fromColor,
            ...font,
            ...style,
          }}
        >
          {content}
        </Tag>
      </div>
    );
  }

  return (
    <Tag
      ref={containerRef}
      className={className}
      style={{
        margin: 0,
        color: fromColor,
        ...font,
        ...style,
      }}
    >
      {content}
    </Tag>
  );
}

export default ScrollHighlight;