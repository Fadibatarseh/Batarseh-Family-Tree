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

  // --- 1. INITIALIZE MERMAID ---
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

  // --- 2. FETCH DATA ---
  useEffect(() => {
    fetchPeople();
  }, []);

  async function fetchPeople() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('family_members').select('*');
      if (error) throw error;

      const peopleObject = {};
      data.forEach(person => { peopleObject[person.id] = person; });
      setPeople(peopleObject);
    } catch (error) {
      console.error("Error loading family:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 3. RENDER TREE ---
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
      const imgTag = p.img_url 
        ? `<img src='${p.img_url}' width='60' height='60' style='border-radius:50%; object-fit:cover; margin-bottom:5px;' /><br/>` 
        : "";
      chart += `${p.id}("${imgTag}<b>${safeName}</b><br/><span style='font-size:0.8em'>${p.birth}${p.death ? ` - ${p.death}` : ""}</span>"):::mainNode\n`;
    });

    Object.values(people).forEach(p => {
      if (p.parents) {
        p.parents.forEach(parId => {
          if (people[parId]) chart += `${parId} --> ${p.id}\n`;
        });
      }
    });

    treeRef.current.innerHTML = `<pre class="mermaid" style="width: 100%; height: 100%;">${chart}</pre>`;
    try {
      await mermaid.run({ nodes: treeRef.current.querySelectorAll('.mermaid') });
    } catch (error) { console.error("Mermaid Render Error:", error); }
  }

  // --- 4. FORM HANDLERS ---
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

  async function save() {
    const personData = {
      name: form.name,
      birth: form.birth,
      death: form.death,
      img_url: form.img_url,
      parents: form.parents
    };

    if (currentEdit) {
      await supabase.from('family_members').update(personData).eq('id', currentEdit);
    } else {
      await supabase.from('family_members').insert([personData]);
    }
    await fetchPeople();
    setModalOpen(false);
  }

  return (
    <div style={styles.pageContainer}>
      
      {/* FIXED HEADER SECTION (The "Poster" on the wall) 
          This stays still while you scroll over it.
      */}
      <div style={styles.heroSection}>
        <div style={styles.heroContent}>
            {/* HUGE LOGO (Approx 5 inches / 480px) */}
            <img src={logo} alt="Batarseh Logo" style={styles.bigLogo} />
            <h1 style={styles.heroTitle}>The Batarseh Family</h1>
            <p style={styles.heroSubtitle}>Scroll down to explore our history</p>
        </div>
      </div>

      {/* SCROLLABLE CONTENT (The "Sheet" that slides up)
          This starts lower down the page and covers the logo.
      */}
      <div style={styles.contentLayer}>
        
        <div style={styles.contentInner}>
            {/* Action Bar inside the white sheet */}
            <div style={styles.actionBar}>
                <span style={styles.memberCount}>{Object.keys(people).length} Members Found</span>
                <button onClick={openAdd} style={styles.addButton}>+ Add Member</button>
            </div>

            {/* The Tree Diagram */}
            <div style={styles.treeContainer}>
                {loading ? <p style={{textAlign:"center", padding:20}}>Loading...</p> : <div ref={treeRef} />}
            </div>

            {/* The Grid Database */}
            <div style={styles.databaseSection}>
                <h3 style={styles.sectionTitle}>Family Database</h3>
                <div style={styles.grid}>
                    {Object.values(people).map(p => (
                    <button key={p.id} onClick={() => openEdit(p.id)} style={styles.card}>
                        <div style={styles.cardImgContainer}>
                        {p.img_url ? <img src={p.img_url} style={styles.cardImg} /> : <div style={styles.cardPlaceholder}>{p.name.charAt(0)}</div>}
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
      </div>

      {/* MODAL POPUP */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ margin: "0 0 20px 0" }}>{currentEdit ? "Edit Profile" : "Add New Member"}</h3>
            
            <label style={styles.label}>Full Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={styles.input} />

            <div style={{display:"flex", gap:"10px"}}>
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
                     <div key={p.id} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                       <input type="checkbox" checked={(form.parents || []).includes(p.id)} onChange={() => toggleParent(p.id)} style={{ marginRight: "10px" }} />
                       <span>{p.name}</span>
                     </div>
                   ))}
               </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={save} style={styles.saveButton}>Save</button>
              <button onClick={() => setModalOpen(false)} style={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === STYLES ===
const styles = {
  pageContainer: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    minHeight: "100vh",
    backgroundColor: "#2c0b0e", // Background matches header color so no gaps show
  },
  
  // PARALLAX HERO SECTION
  heroSection: {
    position: "fixed", // Stays put!
    top: 0,
    left: 0,
    width: "100%",
    height: "90vh", // Covers most of the initial screen
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0, // Sits behind the content
    background: "linear-gradient(to bottom, #2c0b0e, #5c181f)",
    color: "white",
    textAlign: "center"
  },
  heroContent: {
    marginTop: "-100px", // Slight nudge up for balance
  },
  bigLogo: {
    width: "450px", // ~5 inches on standard screen
    height: "auto",
    filter: "drop-shadow(0 0 20px rgba(0,0,0,0.5))"
  },
  heroTitle: {
    fontSize: "3em",
    fontWeight: "normal",
    margin: "20px 0 10px 0",
    letterSpacing: "2px"
  },
  heroSubtitle: {
    fontSize: "1.2em",
    opacity: 0.8,
    fontStyle: "italic"
  },

  // SLIDING CONTENT LAYER
  contentLayer: {
    position: "relative",
    zIndex: 10, // Sits ON TOP of the logo
    marginTop: "85vh", // Starts 85% down the page (so you see the logo first)
    backgroundColor: "#f4f1ea", // Beige paper color
    minHeight: "100vh",
    boxShadow
