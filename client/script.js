let currentUser = null;
const routes = ['Vše', 'A', 'B', 'C'];
let currentWeekOffset = 0;
let currentRouteIndex = 0;
let sortMode = 'default';



function showRegister() {
  document.getElementById('authContainer').classList.add('hidden');
  document.getElementById('registerContainer').classList.remove('hidden');
  clearMessages();
}

function showLogin() {
  document.getElementById('registerContainer').classList.add('hidden');
  document.getElementById('authContainer').classList.remove('hidden');
  clearMessages();
}

function showMessage(id, text, isError = false) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'message ' + (isError ? 'error' : 'success');
  el.style.display = 'block';
}

function clearMessages() {
  const msgs = document.querySelectorAll('.message');
  msgs.forEach(msg => {
    msg.textContent = '';
    msg.style.display = 'none';
    msg.className = 'message';
  });
}

function toggleNameSection() {
  const section = document.getElementById('nameSection');
  section.classList.toggle('hidden');

  if (!section.classList.contains('hidden') && currentUser) {
    document.getElementById('firstName').value = currentUser.firstName || '';
    document.getElementById('lastName').value = currentUser.lastName || '';
  }
}


function toggleApprovalPanel() {
  const panel = document.getElementById('approvalPanel');
  panel.classList.toggle('hidden');

  // Pokud se panel právě zobrazuje, načti uživatele
  if (!panel.classList.contains('hidden')) {
    addApprovalPanel();
  }
}

function addApprovalPanel() {
  const userList = document.getElementById('pendingUsersList');
  userList.innerHTML = '<li>Načítám...</li>';

  fetch('/api/pending-users')
    .then(res => res.json())
    .then(users => {
      userList.innerHTML = '';
      if (users.length === 0) {
        userList.innerHTML = '<li>Žádní uživatelé ke schválení.</li>';
        return;
      }

      users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.firstName} ${user.lastName} (${user.username}) `;

        // Tlačítko Schválit
        const approveBtn = document.createElement('button');
        approveBtn.textContent = 'Schválit';
        approveBtn.style.marginLeft = '10px';
        approveBtn.onclick = () => {
          fetch('/api/approve-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username })
          })
            .then(res => {
              if (res.ok) {
                li.remove();
              } else {
                alert('❌ Nepodařilo se schválit uživatele.');
              }
            })
            .catch(err => {
              console.error('Chyba při schvalování:', err);
              alert('❌ Chyba při komunikaci se serverem.');
            });
        };

        // Tlačítko Zamítnout
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Zamítnout';
        cancelBtn.style.marginLeft = '10px';
        cancelBtn.onclick = () => {
          fetch('/api/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminUsername: currentUser.username,
              targetUsername: user.username
            })
          })
            .then(res => {
              if (res.ok) {
                li.remove();
              } else {
                alert('❌ Nepodařilo se zamítnout uživatele.');
              }
            })
            .catch(err => {
              console.error('Chyba při mazání:', err);
              alert('❌ Chyba při komunikaci se serverem.');
            });
        };

        li.appendChild(approveBtn);
        li.appendChild(cancelBtn);
        userList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Chyba při načítání uživatelů:', error);
      userList.innerHTML = '<li>Chyba při načítání.</li>';
    });
}





function saveNameChange() {
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();

  if (!firstName && !lastName) {
    showMessage('settingsMessage', 'Zadejte alespoň jméno nebo příjmení.', true);
    return;
  }

  fetch('/api/update-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: currentUser.username,  // ← OPRAVA TADY
      firstName,
      lastName
    }),
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (ok) {
        showMessage('settingsMessage', 'Údaje byly úspěšně změněny.');
        currentUser.firstName = firstName;
        currentUser.lastName = lastName;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('userGreeting').innerHTML =
          `<span class="user-name">${firstName} ${lastName}</span>`;
      } else {
        showMessage('settingsMessage', data.error || 'Chyba při ukládání údajů.', true);
      }
    });
}


function savePasswordChange() {
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  if (!newPassword || !oldPassword) {
    showMessage('settingsMessage', 'Vyplňte staré i nové heslo.', true);
    return;
  }

  fetch('/api/update-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: currentUser.username, // ← OPRAVA TADY
      oldPassword,
      newPassword
    }),
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (ok) {
        showMessage('settingsMessage', 'Heslo bylo úspěšně změněno.');
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
      } else {
        showMessage('settingsMessage', data.error || 'Chyba při změně hesla.', true);
      }
    });
}




async function login() {
  clearMessages();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();

      // Uložení údajů do objektu currentUser
      currentUser = {
        username,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        role: data.role || ''
      };

      // Uložení do localStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      // UI přepnutí
      document.getElementById('authContainer').classList.add('hidden');
      document.getElementById('registerContainer').classList.add('hidden');
      document.getElementById('menuContainer').classList.remove('hidden');
      document.getElementById('topBar').classList.remove('hidden');
      document.getElementById('accountSettingsBar').classList.add('hidden');
      showSection('stationListContainer');

      // Vykreslení jména v horním panelu
      document.getElementById('userGreeting').innerHTML = `
        Přihlášený jako: <span class="user-name">${currentUser.firstName} ${currentUser.lastName}</span>
      `;

      // ✅ Zobrazit schvalování pouze pro Lukase
      const approvalSection = document.getElementById('approvalSection');
      if (approvalSection) {
        approvalSection.style.display = (currentUser.username === 'Lukas') ? 'block' : 'none';
      }

      // Načtení výchozí trasy
      cycleRoute(0);

    } else {
      const errorData = await response.json();
      if (response.status === 403) {
        showMessage('loginMessage', errorData.error || 'Účet není aktivní.', true);
      } else {
        showMessage('loginMessage', errorData.error || 'Chyba přihlášení.', true);
      }
    }
  } catch (error) {
    showMessage('loginMessage', 'Došlo k chybě při přihlašování.', true);
    console.error('Chyba při přihlašování:', error);
  }
}








async function register() {
  clearMessages();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();

  if (!username || !password || !firstName || !lastName) {
    showMessage('registerMessage', 'Vyplňte všechna pole.', true);
    return;
  }

  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, firstName, lastName }),
  });

  const data = await response.json();
  if (response.ok) {
    showMessage('registerMessage', 'Registrace proběhla úspěšně.');
    setTimeout(() => {
      showLogin();
    }, 1500);
  } else {
    showMessage('registerMessage', data.error || 'Chyba registrace.', true);
  }
}



function cycleRoute(direction) {
  currentRouteIndex = (currentRouteIndex + direction + routes.length) % routes.length;
  const currentLetter = routes[currentRouteIndex];
  document.getElementById('routeLetter').textContent = currentLetter;

  const fullbar = document.getElementById('menuContainer');
  fullbar.classList.remove('route-green', 'route-yellow', 'route-red');

  if (currentLetter === 'A') {
    fullbar.classList.add('route-green');
  } else if (currentLetter === 'B') {
    fullbar.classList.add('route-yellow');
  } else if (currentLetter === 'C') {
    fullbar.classList.add('route-red');
  }

  loadStations(currentLetter);
}


function handleSortChange() {
  const sortValue = document.getElementById('sortSelect').value;
  sortMode = sortValue; // ← důležité!
  loadStations(routes[currentRouteIndex]); // přenačti seřazené stanice
}

let calendarRendered = false;

function openCalendar() {
  showSection('calendarContainer');

  if (!calendarRendered) {
    renderCalendar(currentWeekOffset);
    calendarRendered = true;
  }

  // Jednoznačně naplnit selecty
  const kontrolaSelect = document.getElementById('selectKontrola');
  const udrzbaSelect = document.getElementById('selectUdrzba');

  [kontrolaSelect, udrzbaSelect].forEach(select => {
    select.innerHTML = '<option value="">Vyber stanici</option>';
    allStations.forEach(station => {
      const option = document.createElement('option');
      option.value = station.name;
      option.textContent = station.name;
      select.appendChild(option);
    });
  });
}




async function renderCalendar(offset) {
  const container = document.getElementById('calendarContainer');
  container.innerHTML = '';

  const days = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];
  const today = new Date();
  const dayIndex = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayIndex + offset * 7);

  const getISOWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  };

  const weekNumber = getISOWeek(monday);
  const weekLabel = document.createElement('div');
  weekLabel.className = 'calendar-week-label';
  weekLabel.textContent = `Týden č. ${weekNumber}`;
  container.appendChild(weekLabel);

  const navRow = document.createElement('div');
  navRow.className = 'calendar-nav-row';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '←';
  prevBtn.className = 'calendar-nav-button';
  prevBtn.onclick = () => renderCalendar(--currentWeekOffset);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '→';
  nextBtn.className = 'calendar-nav-button';
  nextBtn.onclick = () => renderCalendar(++currentWeekOffset);

  navRow.appendChild(prevBtn);
  navRow.appendChild(nextBtn);
  container.appendChild(navRow);

  const weekDates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split("T")[0]);
  }

  const eventsMap = await fetch('/api/get-calendar-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dates: weekDates })
  }).then(res => res.json());

  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateString = date.toISOString().split("T")[0];

    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';

    const dayName = document.createElement('div');
    dayName.className = 'calendar-day-name';
    dayName.textContent = days[i];

    const dateText = document.createElement('div');
    dateText.className = 'calendar-date';
    dateText.textContent = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;

    const addBtn = document.createElement('button');
    addBtn.className = 'calendar-add-button';
    addBtn.textContent = '+';
    addBtn.onclick = () => {
      if (dayDiv.querySelector('.calendar-form')) return;

      const form = document.createElement('div');
      form.className = 'calendar-form';

form.innerHTML = `
  <div class="type-toggle">
    <span class="type-label left">Dovolená</span>
    <label class="switch">
      <input type="checkbox" class="type-checkbox">
      <span class="slider"></span>
    </label>
    <span class="type-label right">Práce</span>
  </div>
  <div class="work-options" style="display:none; flex-direction: column; gap: 4px;">
    <label><input type="radio" name="workType" value="Kontrola AKU"> Kontrola AKU</label>
    <select id="workSelectKontrola" class="work-aku-select" style="display:none;"></select>
    <label><input type="radio" name="workType" value="Údržba AKU"> Údržba AKU</label>
    <select id="workSelectUdrzba" class="work-aku-select" style="display:none;"></select>
    <label><input type="radio" name="workType" value="Kontrola Monitoringu"> Kontrola Monitoringu</label>
    <label><input type="radio" name="workType" value="Destilování vody"> Destilování vody</label>
    <label><input type="radio" name="workType" value="Oprava"> Oprava</label>
    <textarea class="work-repair-description" placeholder="Popis opravy" style="display:none;"></textarea>
    <label><input type="radio" name="workType" value="Jiné"> Jiné</label>
    <textarea class="work-other-description" placeholder="Popis události" style="display:none;"></textarea>
  </div>
  <div class="calendar-form-buttons">
    <button class="calendar-save-button">Uložit</button>
    <button class="calendar-cancel-button">Zrušit</button>
  </div>
`;

const checkbox = form.querySelector('.type-checkbox');
checkbox.addEventListener('change', () => {
  const workOptions = form.querySelector('.work-options');
  if (checkbox.checked) {
    workOptions.style.display = 'flex';

    const kontrolaSelect = form.querySelector('#workSelectKontrola');
    const udrzbaSelect = form.querySelector('#workSelectUdrzba');

    [kontrolaSelect, udrzbaSelect].forEach(select => {
      if (select.options.length === 0) {
        const routes = ['a', 'b', 'c'];
        routes.forEach(async route => {
          const res = await fetch(`/api/stations/${route}`);
          if (res.ok) {
            const data = await res.json();
            data.forEach(station => {
              const opt = document.createElement('option');
              opt.value = `${route.toUpperCase()}| ${station.name}`;
              opt.textContent = `${route.toUpperCase()}| ${station.name}`;
              select.appendChild(opt);
            });
          }
        });
      }
    });
  } else {
    workOptions.style.display = 'none';
  }
});

form.querySelectorAll('input[name="workType"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const kontrolaSelect = form.querySelector('#workSelectKontrola');
    const udrzbaSelect = form.querySelector('#workSelectUdrzba');
    kontrolaSelect.style.display = radio.value === 'Kontrola AKU' ? 'inline-block' : 'none';
    udrzbaSelect.style.display = radio.value === 'Údržba AKU' ? 'inline-block' : 'none';
    form.querySelector('.work-repair-description').style.display = radio.value === 'Oprava' ? 'block' : 'none';
    form.querySelector('.work-other-description').style.display = radio.value === 'Jiné' ? 'block' : 'none';
  });
});

form.querySelector('.calendar-cancel-button').onclick = () => {
  form.remove();
};

form.querySelector('.calendar-save-button').onclick = async () => {
  const selectedType = checkbox.checked ? "Práce" : "Dovolená";
  const payload = {
    date: dateString,
    type: selectedType,
    firstName: currentUser.firstName,
    lastName: currentUser.lastName
  };

  if (selectedType === "Práce") {
    const selectedRadio = form.querySelector('input[name="workType"]:checked');
    if (!selectedRadio) return alert("Vyber typ práce.");
    let description = '';

    if (selectedRadio.value === 'Kontrola AKU') {
      description = `Kontrola AKU: ${form.querySelector('#workSelectKontrola').value}`;
    } else if (selectedRadio.value === 'Údržba AKU') {
      description = `Údržba AKU: ${form.querySelector('#workSelectUdrzba').value}`;
    } else if (selectedRadio.value === 'Kontrola Monitoringu') {
      description = 'Kontrola Monitoringu';
    } else if (selectedRadio.value === 'Destilování vody') {
      description = 'Destilování vody';
    } else if (selectedRadio.value === 'Oprava') {
      description = `Oprava: ${form.querySelector('.work-repair-description').value.trim()}`;
    } else if (selectedRadio.value === 'Jiné') {
      description = `Jiné: ${form.querySelector('.work-other-description').value.trim()}`;
    }

    if (!description) return alert("Popis události je prázdný.");
    payload.description = description;
  }

  const res = await fetch('/api/add-calendar-entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    form.remove();
    renderCalendar(offset);
  } else {
    alert("Chyba při ukládání.");
  }
};


      dayDiv.appendChild(form);
    };

    dayDiv.appendChild(dayName);
    dayDiv.appendChild(dateText);
    dayDiv.appendChild(addBtn);

    const entries = eventsMap[dateString] || [];
    entries.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'calendar-entry';

      const label = document.createElement('span');
      if (entry.type === "Dovolená") {
        label.textContent = `🌴 ${entry.firstName} ${entry.lastName} – Dovolená`;
      } else if (entry.type === "Práce") {
        label.textContent = `🛠️ ${entry.firstName} ${entry.lastName}: ${entry.description || ''}`;
      }

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'SMAZAT';
removeBtn.className = 'calendar-remove-button danger-button';

      removeBtn.onclick = async () => {
        const payload = {
          date: dateString,
          firstName: entry.firstName,
          lastName: entry.lastName,
          type: entry.type
        };
        if (entry.type === "Práce") {
          payload.description = entry.description;
        }

        const res = await fetch('/api/delete-calendar-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          renderCalendar(offset);
        } else {
          alert("Chyba při mazání.");
        }
      };

      div.appendChild(label);
      div.appendChild(removeBtn);
      dayDiv.appendChild(div);
    });

    container.appendChild(dayDiv);
  }
}




















function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1; // Měsíce jsou 0–11
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}


async function loadStations(routeLetter) {
  const container = document.getElementById('stationListContainer');
  container.innerHTML = '';
  container.classList.remove('hidden');

  let allData = [];

  try {
    if (routeLetter === 'Vše') {
      const routesToLoad = ['a', 'b', 'c'];
      for (const route of routesToLoad) {
        const res = await fetch(`/api/stations/${route}`);
        if (res.ok) {
          const data = await res.json();
          data.forEach((station, index) => {
            station.originalIndex = allData.length + index;
            station.route = route.toUpperCase(); // přidáme trasu ke stanici
          });
          allData = allData.concat(data);
        }
      }
    } else {
      const res = await fetch(`/api/stations/${routeLetter.toLowerCase()}`);
      if (!res.ok) throw new Error('Chyba načítání dat.');
      const data = await res.json();
      data.forEach((station, index) => {
        station.originalIndex = index;
        station.route = routeLetter;
      });
      allData = data;
    }



if (sortMode !== 'default') {
  const getLevel = (s) => {
    if (s.lastCheck && typeof s.electrolyte === 'number' && typeof s.electrolyteEndurance === 'number') {
      const last = new Date(s.lastCheck);
      const now = new Date();
      const days = (now - last) / (1000 * 60 * 60 * 24);
      const drop = (100 / s.electrolyteEndurance) * days;
      return Math.max(0, s.electrolyte - drop);
    }
    return s.electrolyte ?? 0;
  };

  allData.sort((a, b) => {
    switch (sortMode) {
      case 'level-asc':
        return getLevel(a) - getLevel(b);
      case 'level-desc':
        return getLevel(b) - getLevel(a);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'distiller':
        return (b.distiller ? 1 : 0) - (a.distiller ? 1 : 0);
      case 'monitoring':
        return (b.monitoring ? 1 : 0) - (a.monitoring ? 1 : 0);
      default:
        return a.originalIndex - b.originalIndex;
    }
  });
}




allData.forEach(station => {
  const div = document.createElement('div');
  div.className = 'station-item';
	
if (station.lastCheck) {
  const last = new Date(station.lastCheck);
  const now = new Date();
  const lastCheckDate = station.lastCheck ? new Date(station.lastCheck) : null;
const oneMonth = 1000 * 60 * 60 * 24 * 30;
const threeMonths = 1000 * 60 * 60 * 24 * 90;

  if (lastCheckDate) {
    const diff = now - lastCheckDate;
if (diff < oneMonth) {
  div.classList.add('recent-check'); // zelený
} else if (diff < threeMonths) {
  div.classList.add('medium-check'); // oranžový
} else {
  div.classList.add('old-check'); // červený
}
  }
}
	

const nameBox = document.createElement('div');
nameBox.className = 'station-left';

const nameText = document.createElement('div');
nameText.className = 'station-name';
nameText.textContent = station.route ? `${station.route}| ${station.name}` : station.name;


const daysSince = document.createElement('div');
daysSince.className = 'station-days-since';

if (station.lastCheck) {
  const last = new Date(station.lastCheck);
  const now = new Date();
  const days = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  daysSince.textContent = `${days} dní od poslední kontroly`;
} else {
  daysSince.textContent = 'Bez záznamu o kontrole';
}

nameBox.appendChild(nameText);
nameBox.appendChild(daysSince);


  const iconBox = document.createElement('div');
  iconBox.className = 'station-icons station-right';

  // Monitoring ikona
if (station.monitoring) {
  const monImg = document.createElement('img');
  monImg.src = '/img/monitoring.png';
  monImg.alt = 'monitoring';
  monImg.className = 'station-icon';
  iconBox.appendChild(monImg);
}

// Destilační přístroj ikona
if (station.distiller) {
  const destImg = document.createElement('img');
  destImg.src = '/img/destiller.png';
  destImg.alt = 'destilační přístroj';
  destImg.className = 'station-icon';
  iconBox.appendChild(destImg);
}

// Aku ikona (vždy)
const img = document.createElement('img');
img.src = station.unitType === 'Blok' ? '/img/akublok.png' : '/img/aku.png';
img.alt = station.unitType || 'Článek';
img.className = 'station-icon';
iconBox.appendChild(img);



  // výpočet odhadované hladiny
  let estimatedLevel = parseFloat(station.electrolyte);
  if (
    station.lastCheck &&
    typeof station.electrolyte === 'number' &&
    typeof station.electrolyteEndurance === 'number'
  ) {
    const last = new Date(station.lastCheck);
    const lastMidnight = new Date(last.getFullYear(), last.getMonth(), last.getDate());

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const daysSince = (todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24);
    const dailyDrop = 100 / station.electrolyteEndurance;

    estimatedLevel = station.electrolyte - daysSince * dailyDrop;
    estimatedLevel = Math.max(0, Math.min(100, estimatedLevel));
  }

  const levelContainer = document.createElement('div');
  levelContainer.className = 'water-container';

const levelFill = document.createElement('div');
levelFill.className = 'water-fill';

if (estimatedLevel < 15) {
  levelFill.classList.add('low');
} else if (estimatedLevel < 30) {
  levelFill.classList.add('medium');
} else {
  levelFill.classList.add('high');
}

levelFill.style.height = `${estimatedLevel}%`;


const percentageText = document.createElement('span');
percentageText.className = 'water-percent-center';
percentageText.textContent = `${Math.round(estimatedLevel)}%`;


  levelContainer.appendChild(levelFill);
  levelContainer.appendChild(percentageText);
  iconBox.appendChild(levelContainer);

  const detailBox = document.createElement('div');
  detailBox.className = 'station-detail';
  detailBox.style.display = 'none';

  const infoText = document.createElement('div');
  infoText.className = 'electrolyte-info';

  let prediction = 'Nedostupné';
  let currentEstimate = 'Nedostupné';

  if (
    station.lastCheck &&
    typeof station.electrolyte === 'number' &&
    typeof station.electrolyteEndurance === 'number'
  ) {
    currentEstimate = Number.isInteger(estimatedLevel)
      ? `${estimatedLevel}%`
      : `${estimatedLevel.toFixed(1)}%`;

    const last = new Date(station.lastCheck);
    const lastMidnight = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const daysLeft = station.electrolyteEndurance * (station.electrolyte / 100);
    const depletionDate = new Date(lastMidnight.getTime() + daysLeft * 24 * 60 * 60 * 1000);
    prediction = formatDate(depletionDate.toISOString());
  }

  infoText.innerHTML = `
    <div>Hladina elektrolytu při kontrole: ${station.electrolyte}%</div>
    <div>Odhadovaná aktuální hladina: ${currentEstimate}</div>
    <div>Předpoklad vyčerpání elektrolytu: ${prediction}</div>
    <div>Poslední kontrola: ${station.lastCheck ? formatDate(station.lastCheck) : 'Neznámá'}</div>
    <div>Typ aku: ${station.akutype || 'neuvedeno'}</div>
		<div>Monitoring: ${station.monitoring ? 'Ano' : 'Ne'}</div>
	<div>Destilační přístroj: ${station.distiller ? 'Ano' : 'Ne'}</div>
	${station.distiller ? `<div>Připraveno vody: ${station.waterLiters || 0} litrů</div>` : ''}
  `;


      const editBtn = document.createElement('button');
      editBtn.textContent = 'Upravit';
      editBtn.className = 'edit-start-btn';

      const editBox = document.createElement('div');
      editBox.className = 'edit-box';
      editBox.style.display = 'none';

      const label = document.createElement('span');
      label.textContent = 'Hladina elektrolytu (%):';
      label.className = 'electrolyte-label';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 100;
      input.value = station.electrolyte;

	  
	  const enduranceLabel = document.createElement('span');
      enduranceLabel.textContent = 'Přibližná výdrž elektrolytu (dny):';
	  enduranceLabel.className = 'electrolyte-label';

	  const enduranceInput = document.createElement('input');
	  enduranceInput.type = 'number';
	  enduranceInput.min = 1;
	  enduranceInput.value = station.electrolyteEndurance || 365;
	  
	  const enduranceRow = document.createElement('div');
	  enduranceRow.className = 'edit-row';
	  enduranceRow.appendChild(enduranceLabel);
	  enduranceRow.appendChild(enduranceInput);

      const dateLabel = document.createElement('span');
      dateLabel.textContent = 'Datum poslední kontroly:';
      dateLabel.className = 'electrolyte-label';

      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.value = station.lastCheck || '';

      const akutypeLabel = document.createElement('span');
      akutypeLabel.textContent = 'Typ aku:';
      akutypeLabel.className = 'electrolyte-label';

      const akutypeSelect = document.createElement('select');
	  akutypeSelect.className = 'akutype-select';

      ['Žádný', '5 OPzS 350'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (station.akutype === type) option.selected = true;
        akutypeSelect.appendChild(option);
      });
	  
// Monitoring
const monitoringRow = document.createElement('div');
monitoringRow.className = 'edit-row';

const monitoringLabel = document.createElement('span');
monitoringLabel.textContent = 'Monitoring:';

const monitoringCheckbox = document.createElement('input');
monitoringCheckbox.type = 'checkbox';
monitoringCheckbox.className = 'styled-checkbox';
monitoringCheckbox.checked = !!station.monitoring;

monitoringRow.appendChild(monitoringLabel);
monitoringRow.appendChild(monitoringCheckbox);

// Destilační přístroj
const distillerRow = document.createElement('div');
distillerRow.className = 'edit-row';

const distillerLabel = document.createElement('span');
distillerLabel.textContent = 'Destilační přístroj:';

const distillerCheckbox = document.createElement('input');
distillerCheckbox.type = 'checkbox';
distillerCheckbox.className = 'styled-checkbox';
distillerCheckbox.checked = !!station.distiller;

distillerRow.appendChild(distillerLabel);
distillerRow.appendChild(distillerCheckbox);

// Zadání množství vody
const waterRow = document.createElement('div');
waterRow.className = 'edit-row';

const waterLabel = document.createElement('span');
waterLabel.textContent = 'Množství vody (litry):';

const waterInput = document.createElement('input');
waterInput.type = 'number';
waterInput.min = 0;
waterInput.step = 0.1;
waterInput.value = station.waterLiters || 0;

waterRow.appendChild(waterLabel);
waterRow.appendChild(waterInput);

// Skrytí pokud distiller není
waterRow.style.display = distillerCheckbox.checked ? 'flex' : 'none';

// Toggle visibility podle checkboxu
distillerCheckbox.addEventListener('change', () => {
  waterRow.style.display = distillerCheckbox.checked ? 'flex' : 'none';
});

const saveBtn = document.createElement('button');
saveBtn.textContent = 'Uložit';

const cancelBtn = document.createElement('button');
cancelBtn.textContent = 'Zavřít';

div.addEventListener('click', () => {
  const isVisible = detailBox.style.display === 'flex';
  detailBox.style.display = isVisible ? 'none' : 'flex';

  // Přidat nebo odebrat třídu 'expanded'
  if (!isVisible) {
    div.classList.add('expanded');
    editBox.style.display = 'none';
    infoText.style.display = 'block';
    editBtn.style.display = 'inline-block';
  } else {
    div.classList.remove('expanded');
  }
});

editBtn.addEventListener('click', () => {
  infoText.style.display = 'none';
  editBtn.style.display = 'none';
  editBox.style.display = 'flex';
});

cancelBtn.addEventListener('click', e => {
  e.stopPropagation();
  editBox.style.display = 'none';
  infoText.style.display = 'block';
  editBtn.style.display = 'inline-block';
});

saveBtn.addEventListener('click', e => {
  e.stopPropagation();
  const numeric = parseFloat(input.value);
  const lastCheckedDate = dateInput.value;

  if (isNaN(numeric) || numeric < 0 || numeric > 100) {
    alert('Zadej číslo mezi 0 a 100.');
    return;
  }

  fetch('/api/update-station', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route: station.route.toLowerCase(),
      stationName: station.name,
      newElectrolyte: numeric,
      newEndurance: parseInt(enduranceInput.value),
      newLastCheck: lastCheckedDate,
      newAkutype: akutypeSelect.value,
      newMonitoring: monitoringCheckbox.checked,
      newDistiller: distillerCheckbox.checked,
      newWaterLiters: parseFloat(waterInput.value),
      newUnitType: unitTypeSelect.value
    })
  })
    .then(res => {
      if (!res.ok) throw new Error('Chyba při ukládání.');
      return res.json();
    })
    .then(() => {
      loadStations(routeLetter);
    })
    .catch(err => {
      alert('Nepodařilo se uložit změnu.');
      console.error(err);
    });
});


      const electrolyteRow = document.createElement('div');
      electrolyteRow.className = 'edit-row';
      electrolyteRow.appendChild(label);
      electrolyteRow.appendChild(input);

      const dateRow = document.createElement('div');
      dateRow.className = 'edit-row';
      dateRow.appendChild(dateLabel);
      dateRow.appendChild(dateInput);

      const akutypeRow = document.createElement('div');
      akutypeRow.className = 'edit-row';
      akutypeRow.appendChild(akutypeLabel);
      akutypeRow.appendChild(akutypeSelect);

	  
	  // Přepínač Blok/Článek
const unitTypeLabel = document.createElement('span');
unitTypeLabel.className = 'electrolyte-label';

const unitTypeSelect = document.createElement('select');
unitTypeSelect.className = 'akutype-select';
['Článek', 'Blok'].forEach(option => {
  const opt = document.createElement('option');
  opt.value = option;
  opt.textContent = option;
  unitTypeSelect.appendChild(opt);
});

unitTypeSelect.value = station.unitType === 'Blok' ? 'Blok' : 'Článek';

const unitTypeRow = document.createElement('div');
unitTypeRow.className = 'edit-row';
unitTypeRow.appendChild(unitTypeLabel);
unitTypeRow.appendChild(unitTypeSelect);

// Buttons row
const buttonRow = document.createElement('div');
buttonRow.className = 'edit-row';
buttonRow.appendChild(saveBtn);
buttonRow.appendChild(cancelBtn);

      editBox.appendChild(electrolyteRow);
	  editBox.appendChild(enduranceRow);
	  editBox.appendChild(dateRow);
      editBox.appendChild(akutypeRow);
	  editBox.appendChild(unitTypeRow);
	  editBox.appendChild(monitoringRow);
	  editBox.appendChild(distillerRow);
	  editBox.appendChild(waterRow);
      editBox.appendChild(buttonRow);
	  

      detailBox.appendChild(infoText);
      detailBox.appendChild(editBtn);
      detailBox.appendChild(editBox);

      div.appendChild(nameBox);
      div.appendChild(iconBox);
      const wrapper = document.createElement('div');
wrapper.className = 'station-wrapper';
wrapper.appendChild(div);
wrapper.appendChild(detailBox);
container.appendChild(wrapper);

    });

  } catch (err) {
    console.error('Chyba při načítání stanic:', err);
    container.innerHTML = '<div style="color: red;">Nepodařilo se načíst stanice.</div>';
  }
}



















function logout() {
  currentUser = null;

  document.getElementById('authContainer').classList.remove('hidden');
  document.getElementById('registerContainer').classList.add('hidden');
  document.getElementById('menuContainer').classList.add('hidden');
  document.getElementById('topBar').classList.add('hidden');
  document.getElementById('accountSettingsBar').classList.add('hidden');
  document.getElementById('passwordSection').classList.add('hidden');
  document.getElementById('stationListContainer').classList.add('hidden');
  document.getElementById('sortContainer').classList.add('hidden');

  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('firstName').value = '';
  document.getElementById('lastName').value = '';
  document.getElementById('oldPassword').value = '';
  document.getElementById('newPassword').value = '';

localStorage.removeItem('currentUser');
  clearMessages();
}

function toggleAccountSettings() {
  const isVisible = !document.getElementById('accountSettingsBar').classList.contains('hidden');
  showSection(isVisible ? 'stationListContainer' : 'accountSettingsBar');
}




function showSection(sectionId) {
  const allSections = ['stationListContainer', 'accountSettingsBar', 'calendarContainer'];
  allSections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(sectionId);
  if (target) target.classList.remove('hidden');

  const sort = document.getElementById('sortContainer');
  if (sort) {
    if (sectionId === 'stationListContainer') {
      sort.classList.remove('hidden');
    } else {
      sort.classList.add('hidden');
    }
  }

  // přepni zobrazení výběru trasy
  const menuContainer = document.getElementById('menuContainer');
  if (menuContainer) {
    if (sectionId === 'stationListContainer') {
      menuContainer.classList.remove('hidden');
    } else {
      menuContainer.classList.add('hidden');
    }
  }
}






function togglePasswordField() {
  const section = document.getElementById('passwordSection');
  section.classList.toggle('hidden');
  document.getElementById('oldPassword').value = '';
  document.getElementById('newPassword').value = '';
}




// Nutné pro funkčnost onclick v HTML
window.login = login;
window.register = register;
window.logout = logout;
window.toggleAccountSettings = toggleAccountSettings;
window.togglePasswordField = togglePasswordField;
window.cycleRoute = cycleRoute;
window.saveNameChange = saveNameChange;
window.savePasswordChange = savePasswordChange;

window.addEventListener('DOMContentLoaded', () => {
  let storedUser;

  try {
    storedUser = JSON.parse(localStorage.getItem('currentUser'));
  } catch (e) {
    console.warn('Neplatný formát currentUser v localStorage.');
    localStorage.removeItem('currentUser');
  }

  if (storedUser && typeof storedUser === 'object') {
    currentUser = storedUser;

    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('registerContainer').classList.add('hidden');
    document.getElementById('menuContainer').classList.remove('hidden');
    document.getElementById('topBar').classList.remove('hidden');
    document.getElementById('accountSettingsBar').classList.add('hidden');

    document.getElementById('userGreeting').innerHTML = `
      <span class="user-name">${storedUser.firstName || ''} ${storedUser.lastName || ''}</span>
    `;

    // Zobrazit sekci pro schvalování pouze pro uživatele Lukas
    const approvalSection = document.getElementById('approvalSection');
    if (approvalSection) {
      approvalSection.style.display = (currentUser.username === 'Lukas') ? 'block' : 'none';
    }

    showSection('stationListContainer');
    cycleRoute(0);
  }

  // 🟢 Přepínání mezi sekcemi
  document.getElementById('calendarButton').addEventListener('click', openCalendar);

  document.getElementById('stationsButton').addEventListener('click', () => {
    showSection('stationListContainer');
  });

  document.getElementById('settingsButton').addEventListener('click', () => {
    showSection('accountSettingsBar');

    if (currentUser) {
      document.getElementById('firstName').value = currentUser.firstName || '';
      document.getElementById('lastName').value = currentUser.lastName || '';
    }

    document.getElementById('passwordSection').classList.add('hidden');
    document.getElementById('settingsMessage').textContent = '';
  });

  // 🔽 Přepínání vstupních polí dle typu práce
  document.querySelectorAll('input[name="workType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const selected = document.querySelector('input[name="workType"]:checked')?.value;

      // Skrytí všech vstupů
      document.getElementById('selectKontrola').style.display = 'none';
      document.getElementById('selectUdrzba').style.display = 'none';
      document.querySelector('.work-repair-description').style.display = 'none';
      document.querySelector('.work-other-description').style.display = 'none';

      // Zobrazení podle výběru
      if (selected === 'Kontrola AKU') {
        document.getElementById('selectKontrola').style.display = 'block';
      } else if (selected === 'Údržba AKU') {
        document.getElementById('selectUdrzba').style.display = 'block';
      } else if (selected === 'Oprava') {
        document.querySelector('.work-repair-description').style.display = 'block';
      } else if (selected === 'Jiné') {
        document.querySelector('.work-other-description').style.display = 'block';
      }
    });
  });
});


window.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    currentUser = JSON.parse(stored);

    // UI přepnutí
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('registerContainer').classList.add('hidden');
    document.getElementById('menuContainer').classList.remove('hidden');
    document.getElementById('topBar').classList.remove('hidden');

    // Jméno
    document.getElementById('userGreeting').innerHTML =
      `<span class="user-name">${currentUser.firstName} ${currentUser.lastName}</span>`;

    // ✅ Viditelnost schvalování
    if (currentUser.username === 'Lukas') {
      document.getElementById('approvalSection').style.display = 'block';
    } else {
      document.getElementById('approvalSection').style.display = 'none';
    }

    // Spustit výběr trasy
    cycleRoute(0);
  }
});






