import { useEffect, useState, useRef } from 'react';
import mermaid from "mermaid";
import { supabase } from './supabaseClient';
import logo from './logo.png';

export default function FamilyTreeApp() {
  const [people, setPeople] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [currentEdit, setCurrentEdit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", birth: "", death: "", img_url: "", parents: [] });
  const treeRef = useRef(null);

  // 1. INITIALIZE MERMAID
  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      flowchart: { curve: 'stepAfter' },
      themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#b91c1c',
        lineColor: '#555',
        secondaryColor: '#f4f4f4',
        tertiaryColor: '#fff'
      }
    });
  }, []); 

  // 2. FETCH DATA FROM SUPABASE
  useEffect(() => {
    fetchPeople();
  }, []);

  async function fetchPeople() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('family_members').select('*');
      
      if (error) throw error;

      // Convert Array from DB back to Object for our app logic
      const peopleObject = {};
      data.forEach(person => {
        peopleObject[person.id] = person;
      });
      
      setPeople(peopleObject);
    } catch (error) {
      console.error("Error loading family:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // 3. RENDER TREE WHEN PEOPLE CHANGE
  useEffect(() => {
    if (!loading) renderTree();
  }, [people, loading]);

  async function renderTree() {
    if (!treeRef.current || Object.keys(people).length === 0) return;

    let chart = `flowchart TD\n`;
    chart += `classDef mainNode fill:#fff,stroke:#b91c1c,stroke-width:2px,rx:5,ry:5,color:#000,width:150px;\n`;
    chart += `linkStyle default stroke:#666,stroke-width:2px;\n`;

    Object.values(people).forEach(p => {
      const safeName = p.name.replace(/"/g, "'");
      // Use img_url from DB
      const imgTag = p.img_url 
        ? `<img src='${p.img_url}' width='60' height='60' style='border-radius:50%; object-fit:cover; margin-bottom:5px;' /><br/>` 
        : "";
      chart += `${p.id}("${imgTag}<b>${safeName}</b><br/><span style='font-size:0.8em'>${p.birth}${p.death ? ` - ${p.death}` : ""}</span>"):::mainNode\n`;
    });

    Object.values(people).forEach(p => {
      if (p.parents && p.parents.length > 0) {
        p.parents.forEach(parId => {
          if (people[parId]) {
            chart += `${parId} --> ${p.id}\n`;
          }
        });
      }
    });

    treeRef.current.innerHTML = `<pre class="mermaid" style="width: 100%; height: 100%;">${chart}</pre>`;
    try {
      await mermaid.run({ nodes: treeRef.current.querySelectorAll('.mermaid') });
    } catch (error) {
      console.error("Mermaid Render Error:", error);
    }
  }

  function openEdit(id) {
    const p = people[id];
    setCurrentEdit(id);
    setForm({ ...p, parents: p.parents || [] });
    setModalOpen(true);
  }

  function openAdd() {
    setCurrentEdit(null);
    setForm({ name: "", birth: "", death: "", img_url: "", parents: [] });
    setModalOpen(true);
  }

  function toggleParent(parentId) {
    const currentParents = form.parents || [];
    if (currentParents.includes(parentId)) {
      setForm({ ...form, parents: currentParents.filter(id => id !== parentId) });
    } else {
      setForm({ ...form, parents: [...currentParents, parentId] });
    }
  }

  // 4. SAVE TO SUPABASE
  async function save() {
    // If no ID (New Person), we don't send an ID so Supabase creates one
    // If ID exists (Edit), we send it to update
    const personData = {
      name: form.name,
      birth: form.birth,
      death: form.death,
      img_url: form.img_url,
      parents: form.parents
    };

    if (currentEdit) {
      // Update existing
      const { error } = await supabase.from('family_members').update(personData).eq('id', currentEdit);
      if (error) alert("Error updating: " + error.message);
    } else {
      // Insert new
      const { error } = await supabase.from('family_members').insert([personData]);
      if (error) alert("Error adding: " + error.message);
    }

    // Refresh data from server
    await fetchPeople();
    setModalOpen(false);
  }

return (
    <div style={styles.pageContainer}>
      
      {/* HEADER SECTION */}
      <div style={styles.header}>
        <img src={logo} alt="Batarseh Logo" style={styles.logo} />
        <h1 style={styles.title}>The Batarseh Family Tree</h1>
        <p style={styles.subtitle}>Preserving our history for future generations</p>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.mainContent}>
        
        {/* ACTION BAR */}
        <div style={styles.actionBar}>
           <button onClick={openAdd} style={styles.addButton}>
             + Add New Member
           </button>
           <span style={styles.memberCount}>
             {Object.keys(people).length} Family Members
           </span>
        </div>

        {/* THE INTERACTIVE TREE (Scrollable) */}
        <div style={styles.treeWindow}>
          {loading ? (
            <div style={styles.loading}>Loading History...</div>
          ) : (
            <div ref={treeRef} style={styles.treeCanvas} />
          )}
        </div>

        {/* MEMBER DATABASE (Grid at bottom) */}
        <div style={styles.databaseSection}>
          <h3 style={styles.sectionTitle}>Family Database</h3>
          <div style={styles.grid}>
            {Object.values(people).map(p => (
              <button key={p.id} onClick={() => openEdit(p.id)} style={styles.card}>
                <div style={styles.cardImgContainer}>
                  {p.img_url ? (
                    <img src={p.img_url} style={styles.cardImg} />
                  ) : (
                    <div style={styles.cardPlaceholder}>{p.name.charAt(0)}</div>
                  )}
                </div>
                <div style={styles.cardText}>
                  <strong>{p.name}</strong>
                  <span style={styles.cardDates}>{p.birth} {p.death && `- ${p.death}`}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* POPUP MODAL (Same as before, just styled) */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ margin: "0 0 20px 0", fontFamily: "Georgia, serif" }}>
              {currentEdit ? "Edit Profile" : "Add New Member"}
            </h3>

            <label style={styles.label}>Full Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={styles.input} />
            
            <div style={{display:"flex", gap:"15px"}}>
                <div style={{flex:1}}>
                    <label style={styles.label}>Birth Year</label>
                    <input value={form.birth} onChange={e => setForm({ ...form, birth: e.target.value })} style={styles.input} />
                </div>
                <div style={{flex:1}}>
                    <label style={styles.label}>Death Year</label>
                    <input value={form.death} onChange={e => setForm({ ...form, death: e.target.value })} style={styles.input} />
                </div>
            </div>

            <label style={styles.label}>Photo URL</label>
            <input placeholder="https://..." value={form.img_url} onChange={e => setForm({ ...form, img_url: e.target.value })} style={styles.input} />
            
            <div>
               <label style={styles.label}>Parents:</label>
               <div style={styles.parentList}>
                 {Object.values(people).filter(p => p.id !== currentEdit).map(p => (
                     <div key={p.id} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                       <input type="checkbox" checked={(form.parents || []).includes(p.id)} onChange={() => toggleParent(p.id)} style={{ marginRight: "10px", transform: "scale(1.2)" }} />
                       <span style={{ fontSize: "1em" }}>{p.name}</span>
                     </div>
                   ))}
               </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={save} style={styles.saveButton}>Save Profile</button>
              <button onClick={() => setModalOpen(false)} style={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === PREMIUM STYLES ===
const styles = {
  pageContainer: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    backgroundColor: "#f4f1ea", // Warm beige background
    minHeight: "100vh",
    color: "#333",
  },
  header: {
    textAlign: "center",
    padding: "40px 20px",
    background: "linear-gradient(to bottom, #2c0b0e, #5c181f)", // Dark Red Gradient
    color: "white",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
  },
  logo: {
    width: "100px",
    height: "auto",
    marginBottom: "10px",
    filter: "drop-shadow(0 0 10px rgba(255,255,255,0.2))"
  },
  title: {
    margin: "0",
    fontSize: "2.5em",
    fontWeight: "normal",
    letterSpacing: "1px"
  },
  subtitle: {
    margin: "5px 0 0 0",
    opacity: 0.8,
    fontStyle: "italic"
  },
  mainContent: {
    maxWidth: "1200px",
    margin: "-30px auto 0", // Pulls content up slightly over header
    padding: "0 20px 40px"
  },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px"
  },
  addButton: {
    padding: "12px 24px",
    backgroundColor: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "30px",
    cursor: "pointer",
    fontSize: "1em",
    fontWeight: "bold",
    boxShadow: "0 4px 6px rgba(185, 28, 28, 0.3)",
    transition: "transform 0.2s"
  },
  memberCount: {
    color: "#666",
    fontStyle: "italic"
  },
  treeWindow: {
    background: "white",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    height: "70vh", // Takes up 70% of the screen height
    overflow: "auto", // Allows scrolling inside the box
    position: "relative",
    border: "1px solid #e5e7eb"
  },
  treeCanvas: {
    minWidth: "100%",
    minHeight: "100%",
    padding: "40px",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center"
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#999",
    fontSize: "1.2em"
  },
  databaseSection: {
    marginTop: "50px",
    borderTop: "1px solid #ccc",
    paddingTop: "30px"
  },
  sectionTitle: {
    color: "#444",
    borderBottom: "2px solid #b91c1c",
    display: "inline-block",
    paddingBottom: "5px",
    marginBottom: "20px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "15px"
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left",
    transition: "box-shadow 0.2s",
    fontFamily: "inherit"
  },
  cardImgContainer: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#eee"
  },
  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  cardPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    fontWeight: "bold"
  },
  cardText: {
    display: "flex",
    flexDirection: "column"
  },
  cardDates: {
    fontSize: "0.8em",
    color: "#777"
  },
  // Modal Styles
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(44, 11, 14, 0.8)", // Dark red tinted overlay
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(3px)"
  },
  modalBox: {
    background: "white",
    padding: "40px",
    width: "450px",
    borderRadius: "10px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "15px"
  },
  input: { padding: "12px", border: "1px solid #ccc", borderRadius: "6px", width: "100%", boxSizing: "border-box", fontSize: "1em" },
  label: { fontSize: "0.9em", fontWeight: "bold", color: "#555", display: "block", marginBottom: "5px" },
  parentList: { border: "1px solid #eee", padding: "15px", borderRadius: "6px", maxHeight: "150px", overflowY: "auto", background: "#fcfcfc" },
  saveButton: { flex: 1, padding: "12px", background: "#b91c1c", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1em", fontWeight: "bold" },
  cancelButton: { flex: 1, padding: "12px", background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1em" }
};
