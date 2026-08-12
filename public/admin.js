const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const statusFilter = document.getElementById("statusFilter");
const tbody = document.getElementById("reservationsBody");

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

async function loadReservations() {
  const params = new URLSearchParams();
  if (startDateFilter.value) params.set("startDate", startDateFilter.value);
  if (endDateFilter.value) params.set("endDate", endDateFilter.value);
  if (statusFilter.value) params.set("status", statusFilter.value);

  const res = await fetch(`/api/admin/reservations?${params}`);
  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="5">Failed to load reservations</td></tr>`;
    return;
  }
  const reservations = await res.json();
  render(reservations);
}

function render(reservations) {
  if (reservations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No reservations found</td></tr>`;
    return;
  }

  tbody.innerHTML = reservations.map((r) => `
    <tr>
      <td>${r.date}</td>
      <td>${r.time}</td>
      <td>${r.name}</td>
      <td>${r.partySize}</td>
      <td>${r.table?.label ?? "—"}</td>
      <td>
        <select class="status-${r.status}" data-id="${r.id}">
          ${["confirmed", "seated", "completed", "no-show", "cancelled"]
            .map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s}</option>`)
            .join("")}
        </select>
      </td>
      <td><button class="deleteBtn" data-id="${r.id}">Delete</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        e.target.className = `status-${status}`;
      } else {
        alert("Failed to update status");
      }
    });
  });

tbody.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (!confirm("Delete this reservation? This cannot be undone.")) return;
      const res = await fetch(`/api/admin/reservations/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadReservations();
      } else {
        alert("Failed to delete reservation");
      }
    });
  });

}

document.getElementById("refreshBtn").addEventListener("click", loadReservations);
document.getElementById("todayBtn").addEventListener("click", () => {
  const today = todayISO();
  startDateFilter.value = today;
  endDateFilter.value = today;
  loadReservations();
});
statusFilter.addEventListener("change", loadReservations);
startDateFilter.addEventListener("change", loadReservations);
endDateFilter.addEventListener("change", loadReservations);

startDateFilter.value = todayISO();
endDateFilter.value = todayISO();
loadReservations();

document.getElementById("deleteAllBtn").addEventListener("click", async () => {
  const rangeText = startDateFilter.value && endDateFilter.value
    ? `from ${startDateFilter.value} to ${endDateFilter.value}`
    : "ALL reservations, regardless of date";

  if (!confirm(`Delete ${rangeText}? This cannot be undone.`)) return;

  const params = new URLSearchParams();
  if (startDateFilter.value) params.set("startDate", startDateFilter.value);
  if (endDateFilter.value) params.set("endDate", endDateFilter.value);
  if (statusFilter.value) params.set("status", statusFilter.value);

  const res = await fetch(`/api/admin/reservations?${params}`, { method: "DELETE" });
  if (res.ok) {
    loadReservations();
  } else {
    alert("Failed to delete reservations");
  }
});