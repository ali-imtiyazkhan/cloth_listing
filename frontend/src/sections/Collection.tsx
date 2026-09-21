import type { MotionValue } from "framer-motion";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import SerifGlowWord from "../components/SerifGlowWord";
import { asset } from "../lib/constants";

const ENV_W = 480;
const ENV_H = 340;
const FLAP_H = 200;

const PHOTO_NAMES = ["Terra", "Love Bag", "Amélie", "Belle", "Mira", "Adele"];
const CARD_Z = [2, 4, 6, 6, 4, 2];

const PEEK: Array<[number, number, number]> = [
  [-90, -30, -12],
  [-40, -60, -6],
  [-15, -78, -2],
  [20, -76, 3],
  [55, -58, 7],
  [95, -28, 12],
];

const END: Array<[number, number, number]> = [
  [-625, 0, 0],
  [-375, 0, 0],
  [-125, 0, 0],
  [125, 0, 0],
  [375, 0, 0],
  [625, 0, 0],
];

const OFF = [0, 0.015, 0.03, 0.045, 0.06, 0.075];

function PhotoCard({
  index,
  scrollYProgress,
  cardsOut,
}: {
  index: number;
  scrollYProgress: MotionValue<number>;
  cardsOut: boolean;
}) {
  const off = OFF[index];
  const a0 = 0.3 + off;
  const a1 = 0.5 + off;
  const b0 = 0.55 + off;
  const b1 = 0.78 + off;

  const [peekX, peekY, peekRot] = PEEK[index];
  const [endX, endY, endRot] = END[index];

  const x = useTransform(
    scrollYProgress,
    [a0, a1, b0, b1],
    [0, peekX, peekX, endX],
  );
  const y = useTransform(
    scrollYProgress,
    [a0, a1, b0, b1],
    [60, peekY, peekY, endY],
  );
  const rotate = useTransform(
    scrollYProgress,
    [a0, a1, b0, b1],
    [0, peekRot, peekRot, endRot],
  );
  const scale = useTransform(scrollYProgress, [a0, a1], [0.5, 1]);

  return (
    <motion.div
      whileHover={{ rotate: [0, -3, 3, -2, 2, 0] }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        position: "absolute",
        left: -90,
        top: -90,
        width: 180,
        zIndex: CARD_Z[index],
        pointerEvents: "auto",
        cursor: "pointer",
        opacity: 1,
        visibility: "visible",
        x,
        y,
        rotate,
        scale,
      }}
    >
      <img
        src={asset(`photo-${index + 1}.png`)}
        alt={PHOTO_NAMES[index]}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
          opacity: 1,
          visibility: "visible",
          pointerEvents: "none",
          display: "block",
        }}
      />

      <motion.div
        animate={{ opacity: cardsOut ? 1 : 0, y: cardsOut ? 0 : 8 }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          delay: 0.1 + index * 0.05,
        }}
        style={{
          position: "absolute",
          top: "calc(100% + 18px)",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          width: 200,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.3px",
            lineHeight: 1.2,
            color: "#FFFFFF",
          }}
        >
          {PHOTO_NAMES[index]}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          €129.90
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Collection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const envelopeY = useTransform(
    scrollYProgress,
    [0, 0.18, 0.45, 0.7, 1],
    [145, 20, 90, 600, 900],
  );
  const envelopeIn = useTransform(scrollYProgress, [0.6, 0.75], [1, 0]);
  const flapRotate = useTransform(scrollYProgress, [0.2, 0.45], [180, 0]);
  const photoWrapperY = useTransform(envelopeY, (v) => -v);

  const [cardsOut, setCardsOut] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [photosAboveFlap, setPhotosAboveFlap] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const out = v >= 0.52;
    const visible = v >= 0.3;
    setCardsOut((prev) => (prev === out ? prev : out));
    setCardsVisible((prev) => (prev === visible ? prev : visible));
  });
  useMotionValueEvent(envelopeY, "change", (v) => {
    const above = v > 85;
    setPhotosAboveFlap((prev) => (prev === above ? prev : above));
  });

  return (
    <section
      ref={containerRef}
      style={{
        background: "#111111",
        position: "relative",
        height: "400vh",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(12px)", y: 20 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            zIndex: 20,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 72,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-3px",
                color: "#FFFFFF",
              }}
            >
              Our
            </span>
            <SerifGlowWord
              word="new"
              fontSize={78}
              lineHeight={78}
              letterSpacing={-3}
              strokeWidth={16}
              italic
              inView
              delay={0.5}
            />
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 72,
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: "-3px",
              color: "#FFFFFF",
            }}
          >
            Collection
          </div>
          <motion.p
            initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
            whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
            style={{
              marginTop: 14,
              maxWidth: 320,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Crafted with care and designed to follow you from day to night, it
            holds not only your essentials, but your stories
          </motion.p>
        </motion.div>

        <motion.div
          style={{
            position: "absolute",
            top: "58%",
            left: "50%",
            width: ENV_W,
            height: ENV_H,
            marginLeft: -240,
            marginTop: -170,
            overflow: "visible",
            y: envelopeY,
          }}
        >
          <motion.img
            src={asset("envelop.webp")}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: ENV_W,
              height: ENV_H,
              zIndex: 1,
              opacity: envelopeIn,
              pointerEvents: "none",
            }}
          />
          <motion.img
            src={asset("tapa-left.webp")}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: ENV_H,
              width: "auto",
              zIndex: 3,
              opacity: envelopeIn,
              pointerEvents: "none",
            }}
          />
          <motion.img
            src={asset("tapa-right.webp")}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: ENV_H,
              width: "auto",
              zIndex: 3,
              opacity: envelopeIn,
              pointerEvents: "none",
            }}
          />
          <motion.img
            src={asset("tapa-bajo.webp")}
            alt=""
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: ENV_W,
              zIndex: 4,
              transformOrigin: "bottom center",
              transformPerspective: 1400,
              rotateX: 0,
              opacity: envelopeIn,
              pointerEvents: "none",
            }}
          />
          <motion.div
            style={{
              position: "absolute",
              top: -FLAP_H + 5,
              left: 0,
              width: ENV_W,
              height: FLAP_H,
              zIndex: 8,
              transformOrigin: "bottom center",
              transformPerspective: 1400,
              rotateX: flapRotate,
              opacity: envelopeIn,
            }}
          >
            <img
              src={asset("open-top.webp")}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "fill",
                pointerEvents: "none",
              }}
            />
          </motion.div>

          <motion.div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 0,
              height: 0,
              pointerEvents: "none",
              display: cardsVisible ? "block" : "none",
              opacity: 1,
              overflow: "visible",
              zIndex: photosAboveFlap || cardsOut ? 999 : 2,
              y: photoWrapperY,
            }}
          >
            {PHOTO_NAMES.map((_, i) => (
              <PhotoCard
                key={i}
                index={i}
                scrollYProgress={scrollYProgress}
                cardsOut={cardsOut}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "80px 60px 120px",
          background: "linear-gradient(180deg, transparent 0%, #111111 50%)",
          pointerEvents: "none",
        }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-200px" }}
        transition={{ duration: 1, delay: 1.5 }}
      >
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          pointerEvents: "auto",
        }}>
          <div style={{
            textAlign: "center",
            marginBottom: 48,
          }}>
            <span style={{
              display: "inline-block",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "3px",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              Shop by Category
            </span>
            <h2 style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              color: "#FFFFFF",
            }}>
              Explore Our
              <br />
              <span style={{ color: "#EAFE79" }}>Range</span>
            </h2>
          </div>

          <div style={{
            marginTop: 60,
            textAlign: "center",
          }}>
            <Link
              to="/tryon"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "18px 48px",
                background: "#EAFE79",
                border: "1px solid #EAFE79",
                borderRadius: 0,
                color: "#111111",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "1px",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#111111";
                e.currentTarget.style.color = "#EAFE79";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#EAFE79";
                e.currentTarget.style.color = "#111111";
              }}
            >
              Open Virtual Try-On
              <span style={{
                display: "inline-flex",
                width: 20,
                height: 20,
                background: "#111111",
                color: "#EAFE79",
                borderRadius: "50%",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}>
                →
              </span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}