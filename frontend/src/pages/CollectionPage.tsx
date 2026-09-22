import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams, useNavigate } from "react-router-dom";
import SerifGlowWord from "../components/SerifGlowWord";
import AdminModal from "../components/AdminModal";
import { useAdmin } from "../lib/adminAuth";
import { fetchPublicItems, deleteClothItem } from "../lib/api";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import {
  COLLECTION_CATEGORIES,
  COLLECTION_ITEMS,
  type GarmentItem,
} from "../data/collectionData";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function CollectionPage() {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [itemsList, setItemsList] = useState<GarmentItem[]>(COLLECTION_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "newest">("featured");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<GarmentItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [cartCount, setCartCount] = useState(0);

  // Sync with backend items if available
  const loadBackendItems = async () => {
    try {
      const backendItems = await fetchPublicItems();
      if (backendItems && backendItems.length > 0) {
        const mapped: GarmentItem[] = backendItems.map((bi) => ({
          id: bi.id,
          name: bi.name,
          category: (bi.category.toLowerCase() as any) || "shirts",
          categoryLabel: bi.category.charAt(0).toUpperCase() + bi.category.slice(1),
          price: Number(bi.price),
          badge: "NEW INVENTORY",
          code: `REF // ${bi.id.slice(0, 4).toUpperCase()}`,
          fabric: "Custom Atelier Selection",
          fit: "Regular Fit",
          description: bi.description,
          colors: ["#1C1B19", "#EEEAE3"],
          imageUrl: bi.imageUrl.startsWith("http") ? bi.imageUrl : `http://localhost:4000${bi.imageUrl}`,
          isNew: true,
        }));
        // Merge without duplicating IDs
        setItemsList((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = mapped.filter((m) => !existingIds.has(m.id));
          return [...newOnes, ...prev];
        });
      }
    } catch {
      // Keep static items fallback
    }
  };

  useEffect(() => {
    loadBackendItems();
  }, []);

  // Active Category state
  const activeCategory = useMemo(() => {
    if (!category) return "all";
    const found = COLLECTION_CATEGORIES.find(
      (c) => c.id.toLowerCase() === category.toLowerCase()
    );
    return found ? found.id : "all";
  }, [category]);

  // Filter items
  const filteredItems = useMemo(() => {
    let list = [...itemsList];

    // Filter category
    if (activeCategory !== "all") {
      list = list.filter((item) => item.category === activeCategory);
    }

    // Filter search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.fabric.toLowerCase().includes(q) ||
          item.fit.toLowerCase().includes(q) ||
          item.categoryLabel.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }

    return list;
  }, [itemsList, activeCategory, searchQuery, sortBy]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTryOnGarment = (item: GarmentItem) => {
    if (!isAdmin) {
      setAdminModalOpen(true);
      return;
    }
    navigate("/tryon", {
      state: {
        presetCloth: {
          id: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          category: item.categoryLabel,
        },
      },
    });
  };

  const handleDeleteItem = async (item: GarmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to remove "${item.name}" from catalog?`)) {
      return;
    }

    try {
      await deleteClothItem(item.id);
    } catch {
      // Even if backend fails (e.g. static item), remove from current view
    }
    setItemsList((prev) => prev.filter((p) => p.id !== item.id));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EEEAE3",
        color: TEXT_COLOR,
        fontFamily: "'Inter Tight', system-ui, sans-serif",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <AdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onItemCreated={loadBackendItems}
      />

      {/* Editorial Navbar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 36px",
          background: "rgba(238, 234, 227, 0.88)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(84, 84, 84, 0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            to="/"
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "#1C1B19",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, opacity: 0.5, letterSpacing: "1px" }}>[STUDIO]</span>
            <span>Fitting Room</span>
          </Link>
          <span
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontSize: 15,
              color: "rgba(84,84,84,0.6)",
              marginLeft: 4,
            }}
          >
            / Collection 2026
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link
            to="/"
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: TEXT_COLOR,
              textDecoration: "none",
              opacity: 0.7,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
          >
            Home
          </Link>
          <Link
            to="/collection"
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: "#1C1B19",
              textDecoration: "none",
              position: "relative",
            }}
          >
            Collection
            <span
              style={{
                position: "absolute",
                bottom: -4,
                left: 0,
                right: 0,
                height: 2,
                background: "#1C1B19",
                borderRadius: 1,
              }}
            />
          </Link>
          <span
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: TEXT_COLOR,
              opacity: 0.6,
              cursor: "pointer",
            }}
          >
            Favorites ({Object.values(favorites).filter(Boolean).length})
          </span>
          <span
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: TEXT_COLOR,
              opacity: 0.6,
              cursor: "pointer",
            }}
          >
            Cart ({cartCount})
          </span>

          {/* Conditional Try On & Admin status */}
          {isAdmin ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link
                to="/tryon"
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "#1C1B19",
                  textDecoration: "none",
                  padding: "9px 18px",
                  background: GLOW_COLOR,
                  border: "1px solid rgba(28,27,25,0.1)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1C1B19";
                  e.currentTarget.style.color = GLOW_COLOR;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = GLOW_COLOR;
                  e.currentTarget.style.color = "#1C1B19";
                }}
              >
                <span>✦</span>
                <span>Virtual Try-On</span>
              </Link>
              <button
                onClick={() => setAdminModalOpen(true)}
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "7px 12px",
                  background: "#1C1B19",
                  color: GLOW_COLOR,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.5px",
                }}
              >
                Admin Active
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdminModalOpen(true)}
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(84,84,84,0.6)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                padding: "4px 8px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1C1B19")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(84,84,84,0.6)")}
            >
              Admin Login
            </button>
          )}
        </nav>
      </header>

      {/* Main Editorial Hero Header */}
      <section
        style={{
          padding: "70px 48px 40px",
          maxWidth: 1380,
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Editorial Watermark Number */}
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 48,
            fontFamily: "'Instrument Serif', serif",
            fontSize: "clamp(80px, 12vw, 150px)",
            fontWeight: 400,
            lineHeight: 1,
            color: "rgba(84,84,84,0.08)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          (02)
        </div>

        <div style={{ maxWidth: 880 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 12px",
              background: "rgba(84,84,84,0.08)",
              marginBottom: 20,
              border: "1px solid rgba(84,84,84,0.12)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#B5482A",
              }}
            />
            <span
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: "#1C1B19",
              }}
            >
              READY-TO-WEAR ARCHIVE 2026
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: "clamp(44px, 6vw, 76px)",
              fontWeight: 600,
              lineHeight: 0.98,
              letterSpacing: "-2.8px",
              color: "#1C1B19",
              marginBottom: 20,
            }}
          >
            Curated pieces for your{" "}
            <span style={{ display: "inline-block", verticalAlign: "middle" }}>
              <SerifGlowWord
                word="wardrobe"
                fontSize={78}
                lineHeight={76}
                letterSpacing={-3}
                strokeWidth={18}
                italic
                delay={0.2}
              />
            </span>
          </h1>

          <p
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 17,
              fontWeight: 400,
              lineHeight: 1.65,
              color: "rgba(84,84,84,0.85)",
              maxWidth: 620,
            }}
          >
            Explore our signature range of heavyweight denim, tailored shirts, raw-edge tees, and architectural trousers. Designed for timeless silhouette and tactile longevity.
          </p>
        </div>
      </section>

      {/* Admin Action Bar (Only visible when logged in as Admin) */}
      {isAdmin && (
        <section
          style={{
            maxWidth: 1380,
            margin: "0 auto 20px",
            padding: "0 48px",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              background: "#1C1B19",
              color: "#EEEAE3",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  background: GLOW_COLOR,
                  color: "#1C1B19",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "1px",
                }}
              >
                ADMIN ACCESS
              </span>
              <span style={{ fontSize: 13, color: "rgba(238,234,227,0.8)" }}>
                You have permission to upload new garments, delete items, and run virtual try-on.
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setAdminModalOpen(true)}
                style={{
                  padding: "8px 16px",
                  background: GLOW_COLOR,
                  color: "#1C1B19",
                  border: "none",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Upload New Garment
              </button>
              <Link
                to="/tryon"
                style={{
                  padding: "8px 16px",
                  background: "rgba(255,255,255,0.15)",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Go to Fitting Room →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Filter and Category Ribbon */}
      <section
        style={{
          position: "sticky",
          top: 70,
          zIndex: 40,
          background: "rgba(238, 234, 227, 0.95)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(84, 84, 84, 0.12)",
          borderBottom: "1px solid rgba(84, 84, 84, 0.12)",
          padding: "16px 48px",
        }}
      >
        <div
          style={{
            maxWidth: 1380,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Category Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {COLLECTION_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (cat.id === "all") navigate("/collection");
                    else navigate(`/collection/${cat.id}`);
                  }}
                  style={{
                    position: "relative",
                    padding: "8px 18px",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: "0.2px",
                    color: isActive ? "#1C1B19" : "rgba(84,84,84,0.7)",
                    background: isActive ? GLOW_COLOR : "transparent",
                    border: isActive
                      ? "1px solid #1C1B19"
                      : "1px solid rgba(84,84,84,0.16)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = "rgba(28,27,25,0.4)";
                      e.currentTarget.style.color = "#1C1B19";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = "rgba(84,84,84,0.16)";
                      e.currentTarget.style.color = "rgba(84,84,84,0.7)";
                    }
                  }}
                >
                  <span>{cat.label}</span>
                  <span
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontSize: 12,
                      opacity: isActive ? 0.9 : 0.5,
                    }}
                  >
                    ({cat.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Sort controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Search Input */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Search cut, fabric, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "8px 14px 8px 32px",
                  background: "#F8F6F1",
                  border: "1px solid rgba(84,84,84,0.2)",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13,
                  color: "#1C1B19",
                  outline: "none",
                  width: 220,
                  transition: "border-color 0.2s, width 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#1C1B19";
                  e.currentTarget.style.width = "260px";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(84,84,84,0.2)";
                  e.currentTarget.style.width = "220px";
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  fontSize: 13,
                  opacity: 0.5,
                  pointerEvents: "none",
                }}
              >
                ⌕
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "none",
                    border: "none",
                    fontSize: 14,
                    cursor: "pointer",
                    color: "rgba(84,84,84,0.6)",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "8px 12px",
                background: "#F8F6F1",
                border: "1px solid rgba(84,84,84,0.2)",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 13,
                color: "#1C1B19",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="featured">Sort: Featured</option>
              <option value="newest">Sort: Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </section>

      {/* Garment Grid */}
      <main
        style={{
          maxWidth: 1380,
          margin: "0 auto",
          padding: "48px 48px 90px",
        }}
      >
        {/* Results counter metadata */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            borderBottom: "1px solid rgba(84,84,84,0.1)",
            paddingBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "#1C1B19",
              }}
            >
              Showing {filteredItems.length} Garments
            </span>
            {activeCategory !== "all" && (
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: "#B5482A",
                }}
              >
                in {activeCategory.toUpperCase()}
              </span>
            )}
          </div>

          <div
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12,
              color: "rgba(84,84,84,0.6)",
              letterSpacing: "0.5px",
            }}
          >
            {isAdmin ? (
              <span style={{ color: "#1C1B19", fontWeight: 600 }}>
                ✦ ADMIN MODE: TRY ON & INVENTORY CONTROLS ENABLED
              </span>
            ) : (
              <span>AUTUMN / WINTER 2026 ARCHIVE</span>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div
            style={{
              padding: "100px 20px",
              textAlign: "center",
              background: "#F8F6F1",
              border: "1px dashed rgba(84,84,84,0.2)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <h3
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#1C1B19",
                marginBottom: 8,
              }}
            >
              No garments found matching "{searchQuery}"
            </h3>
            <p style={{ fontSize: 14, color: "rgba(84,84,84,0.6)", marginBottom: 20 }}>
              Try adjusting your search query or reset filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                navigate("/collection");
              }}
              style={{
                padding: "10px 24px",
                background: "#1C1B19",
                color: "#EEEAE3",
                border: "none",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Products Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: 36,
          }}
        >
          {filteredItems.map((item, index) => {
            const isFav = !!favorites[item.id];

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: Math.min(index * 0.05, 0.4),
                  ease: EASE_OUT,
                }}
                whileHover={{ y: -6 }}
                style={{
                  background: "#F8F6F1",
                  border: "1px solid rgba(84, 84, 84, 0.16)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "box-shadow 0.25s ease, border-color 0.25s ease",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedItem(item)}
              >
                {/* Photo aperture container */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3/4",
                    overflow: "hidden",
                    background: "#EBE6DD",
                  }}
                >
                  <motion.img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center center",
                    }}
                  />

                  {/* Top Bar Badges */}
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      right: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      zIndex: 3,
                    }}
                  >
                    {item.badge ? (
                      <span
                        style={{
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "1.2px",
                          color: "#1C1B19",
                          background: GLOW_COLOR,
                          padding: "4px 8px",
                          border: "1px solid rgba(28,27,25,0.15)",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <span />
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Admin Delete button */}
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteItem(item, e)}
                          title="Delete item (Admin)"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "rgba(181,72,42,0.85)",
                            color: "#FFFFFF",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✕
                        </button>
                      )}

                      {/* Favorite Heart Button */}
                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        aria-label="Add to favorites"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.85)",
                          backdropFilter: "blur(4px)",
                          border: "1px solid rgba(84,84,84,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: 15,
                          color: isFav ? "#B5482A" : "rgba(84,84,84,0.7)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isFav ? "♥" : "♡"}
                      </button>
                    </div>
                  </div>

                  {/* Quick Try-On Overlay Ribbon (ONLY for Admin) */}
                  {isAdmin && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "12px 14px",
                        background: "linear-gradient(to top, rgba(28,27,25,0.85) 0%, rgba(28,27,25,0) 100%)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        zIndex: 3,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Instrument Serif', serif",
                          fontStyle: "italic",
                          fontSize: 14,
                          color: "#EEEAE3",
                        }}
                      >
                        {item.code}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTryOnGarment(item);
                        }}
                        style={{
                          padding: "6px 14px",
                          background: GLOW_COLOR,
                          color: "#1C1B19",
                          border: "1px solid #1C1B19",
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        }}
                      >
                        <span>✦</span>
                        <span>Try On</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Content & Details */}
                <div style={{ padding: "18px 20px 22px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  {/* Category & Price */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: "rgba(84,84,84,0.7)",
                      }}
                    >
                      {item.categoryLabel}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#1C1B19",
                      }}
                    >
                      ${item.price}
                    </span>
                  </div>

                  {/* Garment Title */}
                  <h3
                    style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 17,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      letterSpacing: "-0.3px",
                      color: "#1C1B19",
                      marginBottom: 8,
                    }}
                  >
                    {item.name}
                  </h3>

                  {/* Fabric description snippet */}
                  <p
                    style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 12.5,
                      fontWeight: 400,
                      lineHeight: 1.5,
                      color: "rgba(84,84,84,0.75)",
                      marginBottom: 16,
                      flexGrow: 1,
                    }}
                  >
                    {item.fabric} • <span style={{ color: "#1C1B19" }}>{item.fit}</span>
                  </p>

                  {/* Action Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderTop: "1px solid rgba(84,84,84,0.12)",
                      paddingTop: 14,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "transparent",
                        border: "1px solid rgba(84,84,84,0.25)",
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        color: TEXT_COLOR,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#1C1B19";
                        e.currentTarget.style.color = "#1C1B19";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(84,84,84,0.25)";
                        e.currentTarget.style.color = TEXT_COLOR;
                      }}
                    >
                      Details & Fit
                    </button>

                    {isAdmin ? (
                      /* Admin-only Try On action */
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTryOnGarment(item);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          background: "#1C1B19",
                          border: "1px solid #1C1B19",
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#F7F4EE",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = GLOW_COLOR;
                          e.currentTarget.style.color = "#1C1B19";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#1C1B19";
                          e.currentTarget.style.color = "#F7F4EE";
                        }}
                      >
                        <span>✦</span>
                        <span>Fitting Room</span>
                      </button>
                    ) : (
                      /* Normal user Add to Bag action (NO Try On button) */
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCartCount((c) => c + 1);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          background: "#1C1B19",
                          border: "1px solid #1C1B19",
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#F7F4EE",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#333333";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#1C1B19";
                        }}
                      >
                        Add to Bag
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </main>

      {/* Bottom Banner (Conditional: AI Engine for Admin, Atelier Craftsmanship for Normal User) */}
      <section
        style={{
          background: "#1C1B19",
          color: "#EEEAE3",
          padding: "80px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 40,
            position: "relative",
            zIndex: 2,
          }}
        >
          {isAdmin ? (
            /* Admin Try-On Banner */
            <>
              <div style={{ maxWidth: 620 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "2.5px",
                    textTransform: "uppercase",
                    color: GLOW_COLOR,
                    marginBottom: 12,
                  }}
                >
                  ADMIN GENERATIVE TRY-ON ENGINE
                </span>
                <h2
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: "clamp(32px, 4.5vw, 54px)",
                    fontWeight: 600,
                    lineHeight: 1.05,
                    letterSpacing: "-1.8px",
                    color: "#FFFFFF",
                    marginBottom: 16,
                  }}
                >
                  Drape any garment on the model in real time.
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "rgba(238,234,227,0.7)",
                  }}
                >
                  Powered by Google Gemini vision models, our Fitting Room accurately captures fabric weight, stitching, silhouette, and drape onto a neutral mannequin.
                </p>
              </div>

              <div>
                <Link
                  to="/tryon"
                  style={{
                    padding: "18px 36px",
                    background: GLOW_COLOR,
                    color: "#1C1B19",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 10px 24px rgba(234,254,121,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span>Launch Virtual Fitting Room</span>
                  <span>→</span>
                </Link>
              </div>
            </>
          ) : (
            /* Normal User Editorial Banner */
            <>
              <div style={{ maxWidth: 620 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "2.5px",
                    textTransform: "uppercase",
                    color: GLOW_COLOR,
                    marginBottom: 12,
                  }}
                >
                  READY-TO-WEAR ARCHIVE
                </span>
                <h2
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: "clamp(32px, 4.5vw, 54px)",
                    fontWeight: 600,
                    lineHeight: 1.05,
                    letterSpacing: "-1.8px",
                    color: "#FFFFFF",
                    marginBottom: 16,
                  }}
                >
                  Tactile craftsmanship and enduring cuts.
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "rgba(238,234,227,0.7)",
                  }}
                >
                  Every garment is sourced from heritage Japanese mills and European linen weavers. Save your favorites and curate your seasonal capsule.
                </p>
              </div>

              <div>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{
                    padding: "16px 32px",
                    background: "transparent",
                    color: GLOW_COLOR,
                    border: `1px solid ${GLOW_COLOR}`,
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                  }}
                >
                  Back to Top ↑
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Quick View / Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(28,27,25,0.7)",
                backdropFilter: "blur(8px)",
              }}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                maxWidth: 880,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#EEEAE3",
                border: "1px solid rgba(84,84,84,0.2)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(28,27,25,0.1)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: "#1C1B19",
                }}
              >
                ✕
              </button>

              {/* Modal Image */}
              <div
                style={{
                  aspectRatio: "3/4",
                  background: "#E3DED5",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {selectedItem.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: 16,
                      left: 16,
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: "#1C1B19",
                      background: GLOW_COLOR,
                      padding: "4px 8px",
                      border: "1px solid rgba(28,27,25,0.15)",
                    }}
                  >
                    {selectedItem.badge}
                  </span>
                )}
              </div>

              {/* Modal Information */}
              <div style={{ padding: "36px 32px", display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "#B5482A",
                    marginBottom: 6,
                  }}
                >
                  {selectedItem.categoryLabel} // {selectedItem.code}
                </div>

                <h2
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-0.8px",
                    color: "#1C1B19",
                    marginBottom: 8,
                  }}
                >
                  {selectedItem.name}
                </h2>

                <div
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1C1B19",
                    marginBottom: 20,
                  }}
                >
                  ${selectedItem.price}
                </div>

                <p
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "rgba(84,84,84,0.85)",
                    marginBottom: 24,
                  }}
                >
                  {selectedItem.description}
                </p>

                {/* Fabric & Fit Specs */}
                <div
                  style={{
                    borderTop: "1px solid rgba(84,84,84,0.15)",
                    borderBottom: "1px solid rgba(84,84,84,0.15)",
                    padding: "16px 0",
                    marginBottom: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong style={{ color: "#1C1B19" }}>Fabric: </strong>
                    <span style={{ color: TEXT_COLOR }}>{selectedItem.fabric}</span>
                  </div>
                  <div>
                    <strong style={{ color: "#1C1B19" }}>Silhouette: </strong>
                    <span style={{ color: TEXT_COLOR }}>{selectedItem.fit}</span>
                  </div>
                </div>

                {/* Size Selector */}
                <div style={{ marginBottom: 28 }}>
                  <div
                    style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      color: "#1C1B19",
                      marginBottom: 10,
                    }}
                  >
                    Select Size
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["XS", "S", "M", "L", "XL"].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        style={{
                          width: 44,
                          height: 40,
                          background: selectedSize === size ? "#1C1B19" : "transparent",
                          color: selectedSize === size ? "#EEEAE3" : "#1C1B19",
                          border: "1px solid rgba(84,84,84,0.3)",
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA Buttons in Modal (Conditional) */}
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        handleTryOnGarment(selectedItem);
                        setSelectedItem(null);
                      }}
                      style={{
                        padding: "14px 20px",
                        background: GLOW_COLOR,
                        color: "#1C1B19",
                        border: "1px solid #1C1B19",
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <span>✦</span>
                      <span>Try On with 3D Dummy</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setCartCount((c) => c + 1);
                      setSelectedItem(null);
                    }}
                    style={{
                      padding: "14px 20px",
                      background: "#1C1B19",
                      color: "#EEEAE3",
                      border: "1px solid #1C1B19",
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      cursor: "pointer",
                    }}
                  >
                    Add to Bag (${selectedItem.price})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editorial Footer */}
      <footer
        style={{
          padding: "50px 48px",
          background: "#EEEAE3",
          borderTop: "1px solid rgba(84, 84, 84, 0.12)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13,
          color: "rgba(84,84,84,0.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 600, color: "#1C1B19" }}>FITTING ROOM STUDIO</span>
          <span>•</span>
          <span>Bags, Garments & Editorial Archive</span>
        </div>
        <div>
          <span>© 2026 Ready-to-Wear Atelier. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
