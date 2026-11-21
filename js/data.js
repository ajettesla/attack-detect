/* data.js — loads tactics.json & techniques.json into DB */
const DB = { tactics: [], techniques: [], usersFile: null, loaded: false };

async function loadDB() {
  try {
    const [tacticsRes, techniquesRes, usersRes] = await Promise.all([
      fetch("data/tactics.json"),
      fetch("data/techniques.json"),
      fetch("data/users.json")
    ]);
    DB.tactics = await tacticsRes.json();
    DB.techniques = await techniquesRes.json();
    DB.usersFile = await usersRes.json();
    DB.loaded = true;
  } catch (e) {
    console.error("Failed to load data:", e);
    throw e;
  }
}

function getTactic(id) { return DB.tactics.find(t => t.id === id); }
function getTechnique(id) { return DB.techniques.find(t => t.id === id); }