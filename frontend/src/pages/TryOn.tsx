import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { submitTryOnJob, getJobStatus, resultImageUrl } from "../lib/api";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";

const CATEGORIES = [
  { id: "shirts", label: "Shirts", count: 24 },
  { id: "jeans", label: "Jeans", count: 18 },
  { id: "trousers", label: "Trousers", count: 15 },
  { id: "lower", label: "Lower Garments", count: 12 },
  { id: "undergarments", label: "Undergarments", count: 20 },
];

export default function TryOn() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
  const [step, setStep] = useState<"upload" | "processing" | "result">("upload");
  const [clothFile, setClothFile] = useState<File | null>(null);
  const [clothPreview, setClothPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"queued" | "processing" | "done" | "failed">("queued");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }
    setError(null);
    const preview = URL.createObjectURL(file);
    setClothFile(file);
    setClothPreview(preview);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!clothFile) {
      setError("Please select a garment image");
      return;
    }
    setError(null);
    setStep("processing");
    setStatus("queued");
    try {
      const { jobId: newJobId } = await submitTryOnJob(clothFile);
      startPolling(newJobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("upload");
    }
  };

  const startPolling = (id: string) => {
    setPolling(true);
    const poll = async () => {
      try {
        const record = await getJobStatus(id);
        setStatus(record.status);
        if (record.status === "done" && record.resultUrl) {
          setResultUrl(resultImageUrl(record.resultUrl));
          setStep("result");
          setPolling(false);
        } else if (record.status === "failed") {
          setError(record.error || "Generation failed");
          setStep("upload");
          setPolling(false);
        } else {
          if (polling) setTimeout(poll, 2000);
        }
      } catch {
        if (polling) setTimeout(poll, 2000);
      }
    };
    poll();
  };

  useEffect(() => {
    return () => {
      setPolling(false);
      if (clothPreview) URL.revokeObjectURL(clothPreview);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, []);

  const reset = () => {
    setStep("upload");
    setClothFile(null);
    setClothPreview(null);
    setStatus("queued");
    setResultUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const UploadWell = ({
    label,
    preview,
    onClick,
    onDrop,
    onDragOver,
    inputRef,
    children,
  }: {
    label: string;
    preview: string | null;
    onClick: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    children: React.ReactNode;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          position: "relative",
          aspectRatio: "3/4",
          border: "2px dashed rgba(84,84,84,0.3)",
          borderRadius: 0,
          background: preview ? "transparent" : "#FAFAFA",
          cursor: "pointer",
          overflow: "hidden",
          transition: "border-color 0.2s, background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = GLOW_COLOR;
          e.currentTarget.style.background = "#FEFEFE";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(84,84,84,0.3)";
          e.currentTarget.style.background = preview ? "transparent" : "#FAFAFA";
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
        />
        {preview ? (
          <img
            src={preview}
            alt={label}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "#FFFFFF",
            }}
          />
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: 40,
            textAlign: "center",
            color: "rgba(84,84,84,0.6)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{children}</div>
            <div style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: "-0.3px",
              color: TEXT_COLOR,
            }}>
              {label}
            </div>
            <div style={{
              marginTop: 8,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12,
              color: "rgba(84,84,84,0.4)",
            }}>
              Click or drag & drop
            </div>
          </div>
        )}
        {preview && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              handleFileSelect(null);
            }}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 50,
              border: "none",
              background: "rgba(28,27,25,0.8)",
              color: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </motion.button>
        )}
      </div>
      <div style={{
        marginTop: 16,
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 13,
        color: "rgba(84,84,84,0.5)",
        textAlign: "center",
      }}>
        Upload your garment photo for visualization
      </div>
    </motion.div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F7F4EE",
      fontFamily: "'Inter Tight', sans-serif",
      color: "#1C1B19",
    }}>
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 60px",
        background: "rgba(247,244,238,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(28,27,25,0.06)",
      }}>
        <Link to="/" style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "-0.5px",
          color: "#1C1B19",
          textDecoration: "none",
        }}>
          Fitting Room
        </Link>
        <nav style={{ display: "flex", gap: 32 }}>
          <Link to="/" style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(28,27,25,0.6)",
            textDecoration: "none",
          }}>
            Collection
          </Link>
          <Link to="/tryon" style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#1C1B19",
            textDecoration: "none",
          }}>
            Try On
          </Link>
        </nav>
      </header>

      <main style={{ paddingTop: 100, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 40px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <span style={{
                display: "inline-block",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "3px",
                color: "#B5482A",
                textTransform: "uppercase",
                marginBottom: 16,
              }}>
                Garment Visualization
              </span>
              <h1 style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: "clamp(40px, 6vw, 72px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-3px",
                color: "#1C1B19",
                marginBottom: 16,
              }}>
                See your garment
                <br />
                <span style={{ color: "#B5482A" }}>on display</span>
              </h1>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 18,
                lineHeight: 1.6,
                color: "rgba(28,27,25,0.5)",
                maxWidth: 520,
                margin: "0 auto",
              }}>
                Upload a garment photo. Our AI dresses a dummy model with your clothing
                preserving color, pattern, texture, and fit.
              </p>
            </div>

            {step === "upload" && (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 40,
                  marginBottom: 48,
                }}>
                  <UploadWell
                    label="Garment"
                    preview={clothPreview}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    inputRef={fileInputRef}
                  >
                    👕
                  </UploadWell>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: "16px 24px",
                      background: "rgba(181,72,42,0.1)",
                      border: "1px solid rgba(181,72,42,0.3)",
                      borderRadius: 0,
                      marginBottom: 24,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: "#B5482A",
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!clothFile}
                  onClick={handleSubmit}
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    margin: "0 auto",
                    padding: "20px 48px",
                    background: clothFile ? "#1C1B19" : "rgba(28,27,25,0.3)",
                    border: "1px solid rgba(28,27,25,0.1)",
                    borderRadius: 0,
                    color: "#F7F4EE",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    cursor: clothFile ? "pointer" : "not-allowed",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  Generate Preview
                </motion.button>

                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 40,
                  marginTop: 48,
                  paddingTop: 48,
                  borderTop: "1px solid rgba(28,27,25,0.08)",
                }}>
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/collection/${cat.id}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        textDecoration: "none",
                        color: "inherit",
                        opacity: 0.6,
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                    >
                      <span style={{
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: "1px",
                        color: "#1C1B19",
                      }}>
                        {cat.label}
                      </span>
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11,
                        color: "rgba(28,27,25,0.4)",
                      }}>
                        {cat.count} items
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {step === "processing" && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ textAlign: "center" }}
                >
                  <div style={{
                    width: 80,
                    height: 80,
                    margin: "0 auto 32px",
                    border: "3px solid rgba(28,27,25,0.1)",
                    borderTopColor: "#B5482A",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }} />
                  <h2 style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 28,
                    fontWeight: 600,
                    letterSpacing: "-0.5px",
                    color: "#1C1B19",
                    marginBottom: 12,
                  }}>
                    {status === "queued" ? "Queued…" : "Generating your preview…"}
                  </h2>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15,
                    color: "rgba(28,27,25,0.5)",
                  }}>
                    This usually takes 10–30 seconds
                  </p>
                  <div style={{
                    marginTop: 32,
                    width: "100%",
                    maxWidth: 300,
                    marginLeft: "auto",
                    marginRight: "auto",
                    height: 4,
                    background: "rgba(28,27,25,0.1)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}>
                    <motion.div
                      animate={{ width: status === "queued" ? "30%" : "70%" }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{
                        width: "30%",
                        height: "100%",
                        background: "#B5482A",
                      }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {step === "result" && resultUrl && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <h2 style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "-0.5px",
                      color: "#1C1B19",
                      marginBottom: 8,
                    }}>
                      Your Preview is Ready
                    </h2>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 15,
                      color: "rgba(28,27,25,0.5)",
                    }}>
                      The garment has been composited onto the dummy
                    </p>
                  </div>

                  <div style={{
                    position: "relative",
                    aspectRatio: "3/4",
                    border: "1px solid rgba(28,27,25,0.08)",
                    background: "#FFFFFF",
                    overflow: "hidden",
                    marginBottom: 32,
                  }}>
                    <img
                      src={resultUrl}
                      alt="Garment on dummy result"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={reset}
                      style={{
                        padding: "16px 40px",
                        background: "transparent",
                        border: "1px solid rgba(28,27,25,0.2)",
                        borderRadius: 0,
                        color: "#1C1B19",
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Try Another
                    </motion.button>
                    <motion.a
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href={resultUrl}
                      download="tryon-result.png"
                      style={{
                        padding: "16px 40px",
                        background: "#1C1B19",
                        border: "1px solid rgba(28,27,25,0.1)",
                        borderRadius: 0,
                        color: "#F7F4EE",
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      Download
                    </motion.a>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </main>

      <footer style={{
        padding: "60px 40px",
        background: "#1C1B19",
        color: "rgba(255,255,255,0.4)",
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p>Fitting Room — Virtual Try-On</p>
      </footer>
    </div>
  );
}