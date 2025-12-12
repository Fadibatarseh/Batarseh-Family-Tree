import { useEffect, useState, useRef } from 'react';
import mermaid from "mermaid";
// We keep your logo!
import logo from './logo.png';

export default function FamilyTreeApp() {
  // Initial Data
  const [people, setPeople] = useState({
    "1": { id: "1", name: "Grandparent", birth: "1950", death: "", img: "", parents: [], children: [] },
    "2": { id: "2", name: "You", birth: "1980", death: "", img: "", parents: ["1"], children: [] }
  });
  
  const [currentEdit, setCurrentEdit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // CHANGED: 'parents' is now an array [] instead of a text string
  const [form, setForm] = useState({ name: "", birth: "", death: "", img: "", parents: [] });
  const treeRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#b91c1c',
        lineColor: '#000000',
        secondaryColor: '#f4f4f4',
        tertiaryColor: '#fff'
      }
    });
  }, []); 

  useEffect(() => {
    renderTree();
  }, [people]);

  async function renderTree() {
    if (!treeRef.current) return;

    let chart = `flowchart TD\n`;
    chart += `classDef mainNode fill:#fff,stroke:#b91c1c,stroke-width:2px,rx:10,ry:10,color:#000;\n`;
    chart += `linkStyle default stroke:#000,stroke-width:2px;\n`;

    // Draw Nodes
    Object.values(people).forEach(p => {
      const safeName = p.name.replace(/"/g, "'");
      chart += `${p.id}["<b>${safeName}</b><br/>${p.birth}${p.death ? ` - ${p.death}` : ""}"]:::mainNode\n`;
    });

    // Draw Links
    Object.values(people).forEach(p => {
      if (p.parents && p.parents.length > 0) {
        p.parents.forEach(parId => {
          if (people[parId]) {
            chart += `${parId} --> ${p.id}\n`;
          }
        });
      }
    });

    treeRef.current.innerHTML = `<pre class="mermaid">${chart}</pre>`;
    
    try {
      await mermaid.run({
        nodes: treeRef.current.querySelectorAll('.mermaid'),
      });
    } catch (error) {
      console.error("Mermaid failed to render:", error);
    }
  }

  function openEdit(id) {
    const p = people[id];
    setCurrentEdit(id);
    // Load existing parents or empty array
    setForm({ ...p, parents: p.parents || [] });
    setModalOpen(true);
  }

  function openAdd() {
    setCurrentEdit(null);
    setForm({ name: "", birth: "", death: "", img: "", parents: [] });
    setModalOpen(true);
  }

  // NEW: Helper to check/uncheck parents
  function toggleParent(parentId) {
    const currentParents = form.parents || [];
    if (currentParents.includes(parentId)) {
      // Uncheck: Remove from list
      setForm({ ...form, parents: currentParents.filter(id => id !== parentId) });
    } else {
      // Check: Add to list
      setForm({ ...form, parents: [...currentParents, parentId] });
    }
  }

  function save() {
    const updated = { ...people };
    const id = currentEdit || String(Date.now());
    const existing = updated[id] || { children: [] };
    
    updated[id] = { 
      ...existing, 
      ...form, 
      id, 
      parents: form.parents // Saves the list from checkboxes
    };

    setPeople(updated);
    setModalOpen(false);
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Helvetica, Arial, sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img 
            src={logo} 
            alt="Batarseh Logo" 
            style={{ width: "150px", height: "auto", marginBottom: "15px" }} 
          />
          <h1 style={{ color: "#b91c1c", margin: "0" }}>Batarseh Family Tree</h1>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
           <button onClick={openAdd} style={{ 
             padding: "10px 20px", 
             backgroundColor: "#000", 
             color: "#fff", 
             border: "none", 
             borderRadius: "5px",
             cursor: "pointer",
             fontWeight: "bold"
           }}>
             + Add Family Member
           </button>
        </div>

        <div ref={treeRef} style={{ 
          background: "white", 
          padding: "30px", 
          borderRadius: "15px", 
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          minHeight: "300px",
          display: "flex",
          justifyContent: "center"
        }} />

        <div style={{ marginTop: "40px", borderTop: "2px solid #eee", paddingTop: "20px" }}>
          <h3 style={{ color: "#444" }}>Member Database (Click to Edit)</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {Object.values(people).map(p => (
              <button 
                key={p.id} 
                onClick={() => openEdit(p.id)}
                style={{ 
                  padding: "8px 12px", 
                  background: "#fff", 
                  border: "1px solid #ddd", 
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "0.9em"
                }}
              >
                ✏️ {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{ background: "white", padding: "30px", width: "350px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "15px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: 0 }}>{currentEdit ? "Edit" : "Add"} Person</h3>

            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <input placeholder="Birth Year" value={form.birth} onChange={e => setForm({ ...form, birth: e.target.value })} style={inputStyle} />
            <input placeholder="Death Year" value={form.death} onChange={e => setForm({ ...form, death: e.target.value })} style={inputStyle} />
            
            {/* NEW: CHECKBOX LIST FOR PARENTS */}
            <div>
               <label style={{fontSize: "0.9em", fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px"}}>Select Parents:</label>
               <div style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "5px", maxHeight: "150px", overflowY: "scroll", background: "#f9f9f9" }}>
                 {Object.values(people).length === 0 && <span style={{color:"#999", fontSize:"0.8em"}}>No other members yet.</span>}
                 
                 {Object.values(people)
                   .filter(p => p.id !== currentEdit) // Don't allow selecting self as parent
                   .map(p => (
                     <div key={p.id} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                       <input 
                         type="checkbox" 
                         checked={(form.parents || []).includes(p.id)}
                         onChange={() => toggleParent(p.id)}
                         style={{ marginRight: "8px" }}
                       />
                       <span style={{ fontSize: "0.9em" }}>{p.name}</span>
                     </div>
                   ))}
               </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={save} style={{ flex: 1, padding: "10px", background: "#b91c1c", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Save</button>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: "10px", background: "#e5e7eb", color: "black", border: "none", borderRadius: "5px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "5px",
  width: "100%",
  boxSizing: "border-box"
};
