const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3001;

const profilesPath = path.join(__dirname, 'profiles.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/assets', express.static(__dirname));
app.use('/img', express.static(path.join(__dirname, 'img')));

// Pokud neexistuje profiles.json, vytvoř ho
if (!fs.existsSync(profilesPath)) {
  fs.writeFileSync(profilesPath, JSON.stringify([]));
}

// API: Registrace
app.post('/api/register', (req, res) => {
  const { username, password, firstName = '', lastName = '' } = req.body;

  // Kontrola, že všechna pole jsou vyplněná
  if (!username || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Vyplňte všechna pole.' });
  }

  const users = JSON.parse(fs.readFileSync(profilesPath));
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Uživatel už existuje.' });
  }

  users.push({ username, password, firstName, lastName, active: "no" });
  fs.writeFileSync(profilesPath, JSON.stringify(users, null, 2));
  res.json({ success: true });
});


// API: Přihlášení
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(profilesPath));

  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
  if (user.active !== "yes") {
    return res.status(403).json({ error: 'Účet čeká na schválení správcem.' });
  }

  res.json({
    success: true,
    firstName: user.firstName || '',
    lastName: user.lastName || ''
  });
}
 else {
    res.status(401).json({ error: 'Neplatné přihlašovací údaje.' });
  }
});

// API: Aktivace uživatele (pouze pro schvalovatele)
app.post('/api/activate-user', (req, res) => {
  const { adminUsername, targetUsername } = req.body;

  if (adminUsername !== 'Lukas') {
    return res.status(403).json({ error: 'Nemáte oprávnění.' });
  }

  const users = JSON.parse(fs.readFileSync(profilesPath));
  const target = users.find(u => u.username === targetUsername);

  if (!target) {
    return res.status(404).json({ error: 'Uživatel nenalezen.' });
  }

  target.active = 'yes';
  fs.writeFileSync(profilesPath, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

app.get('/api/profiles', (req, res) => {
  const users = JSON.parse(fs.readFileSync(profilesPath));
  res.json(users);
});

app.get('/api/pending-users', (req, res) => {
  const users = JSON.parse(fs.readFileSync(profilesPath));
  const pending = users.filter(u => u.active !== 'yes');

  // Vrací jen potřebné údaje
  const result = pending.map(u => ({
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName
  }));

  res.json(result);
});

app.post('/api/approve-user', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Chybí uživatelské jméno.' });
  }

  const users = JSON.parse(fs.readFileSync(profilesPath));
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(404).json({ error: 'Uživatel nenalezen.' });
  }

  user.active = 'yes'; // nastavíme aktivaci

  fs.writeFileSync(profilesPath, JSON.stringify(users, null, 2));
  res.json({ success: true });
});


app.post('/api/delete-user', (req, res) => {
  const { adminUsername, targetUsername } = req.body;

  if (adminUsername !== 'Lukas') {
    return res.status(403).json({ error: 'Nemáte oprávnění.' });
  }

  let users = JSON.parse(fs.readFileSync(profilesPath));
  const originalLength = users.length;
  users = users.filter(u => u.username !== targetUsername);

  if (users.length === originalLength) {
    return res.status(404).json({ error: 'Uživatel nenalezen.' });
  }

  fs.writeFileSync(profilesPath, JSON.stringify(users, null, 2));
  res.json({ success: true });
});



// API: Aktualizace profilu
app.post('/api/update-profile', (req, res) => {
  const { username, firstName, lastName, oldPassword, newPassword } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Chybí uživatelské jméno.' });
  }

  const users = JSON.parse(fs.readFileSync(profilesPath));
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(404).json({ error: 'Uživatel nenalezen.' });
  }

  // Kontrola starého hesla, pokud chce uživatel změnit heslo
  if (newPassword) {
    if (!oldPassword || user.password !== oldPassword) {
      return res.status(403).json({ error: 'Staré heslo je nesprávné nebo chybí.' });
    }
    user.password = newPassword;
  }

  if (typeof firstName === 'string') user.firstName = firstName;
  if (typeof lastName === 'string') user.lastName = lastName;

  fs.writeFileSync(profilesPath, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// API: Přidání události do kalendáře (např. dovolená)

app.post('/api/add-calendar-entry', (req, res) => {
  const { date, firstName, lastName, type, description } = req.body;

  if (!date || !firstName || !lastName || !type) {
    return res.status(400).json({ error: 'Chybí data.' });
  }

  const dir = path.join(__dirname, 'callendar');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `${date}.json`);
  const newEntry = { firstName, lastName, type };
  if (type === "Práce" && description) {
    newEntry.description = description;
  }

  let existingEntries = [];
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      existingEntries = JSON.parse(content);
      if (!Array.isArray(existingEntries)) existingEntries = [];
    } catch {
      existingEntries = [];
    }
  }

  existingEntries.push(newEntry);

  fs.writeFile(filePath, JSON.stringify(existingEntries, null, 2), 'utf-8', (err) => {
    if (err) {
      console.error('❌ Chyba zápisu kalendáře:', err);
      return res.status(500).json({ error: 'Nepodařilo se uložit událost.' });
    }

    res.json({ success: true });
  });
});

app.post('/api/get-calendar-entries', (req, res) => {
  const { dates } = req.body;
  if (!Array.isArray(dates)) {
    return res.status(400).json({ error: 'Neplatný formát požadavku.' });
  }

  const dir = path.join(__dirname, 'callendar');
  const result = {};

  dates.forEach(date => {
    const filePath = path.join(dir, `${date}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        result[date] = parsed;
      } catch {
        result[date] = [];
      }
    } else {
      result[date] = [];
    }
  });

  res.json(result);
});


app.post('/api/delete-calendar-entry', (req, res) => {
  const { date, firstName, lastName, type, description } = req.body;

  if (!date || !firstName || !lastName || !type) {
    return res.status(400).json({ error: 'Chybí data.' });
  }

  const filePath = path.join(__dirname, 'callendar', `${date}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Soubor nenalezen.' });
  }

  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(entries)) entries = [];
  } catch {
    return res.status(500).json({ error: 'Chyba při čtení souboru.' });
  }

  const filtered = entries.filter(e => {
    const sameBasic = e.firstName === firstName && e.lastName === lastName && e.type === type;
    const sameDesc = type === 'Práce' ? e.description === description : true;
    return !(sameBasic && sameDesc);
  });

  fs.writeFile(filePath, JSON.stringify(filtered, null, 2), 'utf-8', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Chyba při mazání.' });
    }
    res.json({ success: true });
  });
});





// API: Seznam stanic pro trasu A/B/C
app.get('/api/stations/:route', (req, res) => {
  const route = req.params.route.toLowerCase();
  const validRoutes = ['a', 'b', 'c'];

  if (!validRoutes.includes(route)) {
    return res.status(400).json({ error: 'Neplatná trasa.' });
  }

  const filePath = path.join(__dirname, 'stanice', `${route}.json`);

  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Soubor neexistuje.' });
      }
      console.error('❌ Chyba při čtení:', err);
      return res.status(500).json({ error: 'Chyba při čtení souboru.' });
    }

    try {
      const parsed = JSON.parse(data);
      
      res.json(parsed);
    } catch (parseErr) {
      console.error('❌ Chyba při parsování JSON:', parseErr);
      res.status(500).json({ error: 'Chyba při parsování souboru.' });
    }
  });
});

// API: Aktualizace údajů o stanici
app.post('/api/update-station', (req, res) => {
const {
  route,
  stationName,
  newElectrolyte,
  newLastCheck,
  newAkutype,
  newEndurance,
  newMonitoring,
  newDistiller,
  newWaterLiters,
  newUnitType 
} = req.body;


  if (!route || !stationName) {
    return res.status(400).json({ error: 'Chybné vstupy.' });
  }

  const routeLower = route.toLowerCase();
  const validRoutes = ['a', 'b', 'c'];
  if (!validRoutes.includes(routeLower)) {
    return res.status(400).json({ error: 'Neplatná trasa.' });
  }

  const filePath = path.join(__dirname, 'stanice', `${routeLower}.json`);

  fs.readFile(filePath, 'utf-8', (err, fileData) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Soubor trasy nenalezen.' });
      }
      console.error('❌ Chyba při čtení:', err);
      return res.status(500).json({ error: 'Chyba při čtení souboru.' });
    }

    try {
      const data = JSON.parse(fileData);
      const station = data.find(s => s.name === stationName);
      if (!station) {
        return res.status(404).json({ error: 'Stanice nenalezena.' });
      }

      // Aktualizace hodnot
      if (typeof newElectrolyte === 'number') station.electrolyte = newElectrolyte;
      if (typeof newLastCheck === 'string') station.lastCheck = newLastCheck;
      if (typeof newEndurance === 'number') station.electrolyteEndurance = newEndurance;
      if (typeof newAkutype === 'string') station.akutype = newAkutype;
      if (typeof newMonitoring === 'boolean') station.monitoring = newMonitoring;
      if (typeof newDistiller === 'boolean') station.distiller = newDistiller;
      if (typeof newWaterLiters === 'number') station.waterLiters = newWaterLiters;
	  if (typeof newUnitType === 'string') station.unitType = newUnitType;

      fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8', (writeErr) => {
        if (writeErr) {
          console.error('❌ Chyba zápisu:', writeErr);
          return res.status(500).json({ error: 'Chyba při zápisu souboru.' });
        }

        res.json({ success: true });
      });
    } catch (parseErr) {
      console.error('❌ Chyba při parsování JSON:', parseErr);
      res.status(500).json({ error: 'Chyba při zpracování dat.' });
    }
  });
});







// Start serveru
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
