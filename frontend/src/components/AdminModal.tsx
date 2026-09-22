import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../lib/adminAuth";
import { createClothItem } from "../lib/api";
import { GLOW_COLOR, TEXT_COLOR } from "../lib/constants";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated?: () => void;
}

export default function AdminModal({ isOpen, onClose, onItemCreated }: AdminModalProps) {
  const { isAdmin, login, logout } = useAdmin();
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"auth" | "upload">("auth");

  // Upload item form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("jeans");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkey.trim()) {
      setError("Please enter the admin passkey");
      return;
    }
    setError(null);
    setLoading(true);
    const success = await login(passkey.trim());
    setLoading(false);
    if (success) {
      setError(null);
      setTab("upload");
    } else {
      setError("Invalid admin passkey. (Default: your_admin_secret_key_here or admin123)");
    }
  };

  const handleFillDemoKey = () => {
    setPasskey("your_admin_secret_key_here");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category || !description || !imageFile) {
      setError("Please fill in all fields and select an image");
      return;
    }

    setLoading(true);
    setError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("price", price);
      formData.append("description", description);
      formData.append("image", imageFile);

      await createClothItem(formData);
      setUploadSuccess(`Item "${name}" created successfully in catalog!`);
      setName("");
      setPrice("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      if (onItemCreated) onItemCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 150,
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
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(28,27,25,0.7)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: 540,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#EEEAE3",
              border: "1px solid rgba(84,84,84,0.3)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              padding: "36px 32px",
              fontFamily: "'Inter Tight', sans-serif",
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: "#1C1B19",
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#B5482A",
                  marginBottom: 6,
                }}
              >
                ADMIN ACCESS CONTROL
              </div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "-0.5px",
                  color: "#1C1B19",
                }}
              >
                {isAdmin ? "Admin Workspace" : "Administrator Sign In"}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(84,84,84,0.75)",
                  marginTop: 4,
                }}
              >
                {isAdmin
                  ? "You have administrative rights to upload garments and run the virtual try-on engine."
                  : "Normal users can view the collection and favorites. Sign in as admin to upload items and run try-on."}
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(181,72,42,0.1)",
                  border: "1px solid rgba(181,72,42,0.3)",
                  color: "#B5482A",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            {uploadSuccess && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(76,175,80,0.1)",
                  border: "1px solid rgba(76,175,80,0.3)",
                  color: "#2E7D32",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {uploadSuccess}
              </div>
            )}

            {!isAdmin ? (
              /* Login Form */
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      marginBottom: 8,
                      color: "#1C1B19",
                    }}
                  >
                    Admin Secret Key
                  </label>
                  <input
                    type="password"
                    placeholder="Enter passkey (e.g. your_admin_secret_key_here)"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(84,84,84,0.3)",
                      fontSize: 14,
                      color: "#1C1B19",
                      outline: "none",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleFillDemoKey}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 12,
                      textDecoration: "underline",
                      cursor: "pointer",
                      color: "rgba(84,84,84,0.7)",
                    }}
                  >
                    Quick-fill server admin key
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#1C1B19",
                    color: GLOW_COLOR,
                    border: "none",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    cursor: loading ? "wait" : "pointer",
                    transition: "opacity 0.2s",
                  }}
                >
                  {loading ? "Authenticating..." : "Sign In As Admin"}
                </button>
              </form>
            ) : (
              /* Logged In View */
              <div>
                {/* Status Bar */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: GLOW_COLOR,
                    border: "1px solid #1C1B19",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1B19" }}>
                    ● ADMIN MODE ACTIVE
                  </span>
                  <button
                    onClick={() => {
                      logout();
                      setPasskey("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#1C1B19",
                      textDecoration: "underline",
                    }}
                  >
                    Log Out to Normal User
                  </button>
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 20,
                    borderBottom: "1px solid rgba(84,84,84,0.2)",
                    paddingBottom: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setTab("upload")}
                    style={{
                      padding: "6px 14px",
                      background: tab === "upload" ? "#1C1B19" : "transparent",
                      color: tab === "upload" ? "#EEEAE3" : TEXT_COLOR,
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Add New Garment
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("auth")}
                    style={{
                      padding: "6px 14px",
                      background: tab === "auth" ? "#1C1B19" : "transparent",
                      color: tab === "auth" ? "#EEEAE3" : TEXT_COLOR,
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Permissions & Mode
                  </button>
                </div>

                {tab === "upload" ? (
                  /* Upload Garment Form */
                  <form onSubmit={handleCreateItem}>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                        Garment Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Raw Selvedge Straight Jean"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "#FFFFFF",
                          border: "1px solid rgba(84,84,84,0.3)",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                          Category
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "#FFFFFF",
                            border: "1px solid rgba(84,84,84,0.3)",
                            fontSize: 13,
                            outline: "none",
                          }}
                        >
                          <option value="jeans">Jeans</option>
                          <option value="shirts">Shirts</option>
                          <option value="tshirt">T-Shirts</option>
                          <option value="jackets">Jackets</option>
                          <option value="trousers">Trousers</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                          Price ($)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 165"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "#FFFFFF",
                            border: "1px solid rgba(84,84,84,0.3)",
                            fontSize: 13,
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                        Fabric & Description
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Description, fabric specs, and fit details..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "#FFFFFF",
                          border: "1px solid rgba(84,84,84,0.3)",
                          fontSize: 13,
                          outline: "none",
                          resize: "vertical",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                        Garment Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ fontSize: 13 }}
                      />
                      {imagePreview && (
                        <div style={{ marginTop: 10, width: 80, height: 80, overflow: "hidden", border: "1px solid #1C1B19" }}>
                          <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: "#1C1B19",
                        color: GLOW_COLOR,
                        border: "none",
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        cursor: loading ? "wait" : "pointer",
                      }}
                    >
                      {loading ? "Uploading to Backend..." : "Publish Garment to Catalog"}
                    </button>
                  </form>
                ) : (
                  /* Permissions view */
                  <div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(84,84,84,0.9)", marginBottom: 16 }}>
                      In <strong>Admin Mode</strong>:
                    </p>
                    <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, color: "rgba(84,84,84,0.85)", marginBottom: 20 }}>
                      <li>Virtual Try-On button is visible across the site.</li>
                      <li>You can upload items, edit items, and delete items.</li>
                      <li>Full access to the <code>/tryon</code> fitting room studio.</li>
                    </ul>
                    <p style={{ fontSize: 13, color: "rgba(84,84,84,0.7)", marginBottom: 20 }}>
                      When you log out, you will experience the website exactly as a <strong>Normal User</strong> (where the Try On buttons are hidden, and only collection & favorites are visible).
                    </p>
                    <button
                      onClick={onClose}
                      style={{
                        padding: "10px 20px",
                        background: "#1C1B19",
                        color: "#EEEAE3",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Continue in Admin Mode
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
