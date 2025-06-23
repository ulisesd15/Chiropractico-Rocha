const form = document.getElementById('appt-form');
const tableBody = document.querySelector('#appointments-table tbody');
const timeSelect = document.getElementById('time-select');

function populateTimes() {
  for (let h = 9; h <= 17; h++) {
    ['00', '30'].forEach(m => {
      if (h === 17 && m === '30') return;
      const option = document.createElement('option');
      const hour = h.toString().padStart(2, '0');
      option.value = `${hour}:${m}`;
      option.textContent = `${hour}:${m}`;
      timeSelect.appendChild(option);
    });
  }
}

async function loadAppointments() {
  const res = await fetch('/api/appointments');
  const appts = await res.json();
  tableBody.innerHTML = '';
  appts.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.date}</td><td>${a.time}</td><td>${a.reason}</td><td>${a.status}</td>`;
    const td = document.createElement('td');
    const del = document.createElement('button');
    del.textContent = 'Cancel';
    del.className = 'button is-small is-danger';
    del.onclick = async () => {
      await fetch('/api/appointments/' + a.id, { method: 'DELETE' });
      loadAppointments();
    };
    td.appendChild(del);
    tr.appendChild(td);
    tableBody.appendChild(tr);
  });
}

if (form) {
  populateTimes();
  loadAppointments();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    form.reset();
    loadAppointments();
  });
}
