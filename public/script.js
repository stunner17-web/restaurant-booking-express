const form = document.getElementById("bookingForm");
const errorMsg = document.getElementById("errorMsg");
const submitBtn = document.getElementById("submitBtn");
const dateInput = document.getElementById("date");

// Prevent picking a date before today
dateInput.min = new Date().toISOString().split("T")[0];

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const name = document.getElementById("name").value.trim();
  const partySize = document.getElementById("party").value;
  const time = document.getElementById("time").value;
  const date = dateInput.value;

  if (!name || !date) {
    errorMsg.textContent = "Please fill in all fields.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Booking...";

  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, partySize, date, time }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorMsg.textContent = data.error || "Something went wrong.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm reservation";
      return;
    }

    showConfirmation(data);
  } catch (err) {
    errorMsg.textContent = "Could not reach the server. Try again.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm reservation";
  }
});

function showConfirmation(reservation) {
  const card = document.getElementById("bookingCard");
  card.innerHTML = `
    <div class="eyebrow">Ember &amp; Oak — Austin</div>
    <h1>You're booked in</h1>
    <p class="sub">A confirmation has been noted. We'll hold your table for 15 minutes past the reserved time.</p>
    <div class="ticket">
      <div class="row"><span class="label">Name</span><span class="value">${reservation.name}</span></div>
      <div class="row"><span class="label">Party size</span><span class="value">${reservation.partySize} guests</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${reservation.date}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${reservation.time}</span></div>
    </div>
    <button id="returnBtn">Make another booking</button>
  `;

  document.getElementById("returnBtn").addEventListener("click", () => {location.reload();});
}