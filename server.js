import "dotenv/config";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"; 
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(express.json()); 

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Authentication required");
  }
  const decoded = Buffer.from(authHeader.split(" ")[1], "base64").toString("utf-8");
  const [, password] = decoded.split(":");
  if (password !== process.env.ADMIN_PASSWORD) {
    res.set("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}

app.get("/admin.html", requireAdminAuth, (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "admin.html"));
});

app.use("/api/admin", requireAdminAuth); 
 

app.get("/api/admin/reservations", async (req, res) => {
  const { startDate, endDate, status } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.date = { gte: startDate };
  } else if (endDate) {
    where.date = { lte: endDate };
  }
  if (status) where.status = status;

  const reservations = await prisma.reservation.findMany({
    where,
    include: { table: true },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  res.json(reservations);
});

app.patch("/api/admin/reservations/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ["confirmed", "seated", "completed", "no-show", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }
  try {
    const reservation = await prisma.reservation.update({
      where: { id: Number(id) },
      data: { status },
    });
    res.json(reservation);
  } catch {
    res.status(404).json({ error: "Reservation not found" });
  }
});

app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});


// Check which tables are free for a given date/time/party size
app.get("/api/availability", async (req, res) => {
  const { date, time, partySize } = req.query;

  if (!date || !time || !partySize) {
    return res.status(400).json({ error: "Missing date, time, or partySize" });
  }

  const size = Number(partySize);

  const tables = await prisma.restaurantTable.findMany({
    where: { capacity: { gte: size } },
    include: {
      reservations: {
        where: { date, time, status: { not: "cancelled" } },
      },
    },
  });

  const availableTables = tables.filter((t) => t.reservations.length === 0);

  res.json(availableTables);
});

// Create a reservation
app.post("/api/reservations", async (req, res) => {
  const { name, partySize, date, time } = req.body;

  if (!name || !partySize || !date || !time) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const size = Number(partySize);

  const table = await prisma.restaurantTable.findFirst({
    where: {
      capacity: { gte: size },
      reservations: { none: { date, time, status: { not: "cancelled" } } },
    },
    orderBy: { capacity: "asc" }, // prefer the smallest table that fits
  });

  if (!table) {
    return res.status(409).json({ error: "No tables available for that time" });
  }

  const reservation = await prisma.reservation.create({
    data: { name, partySize: size, date, time, tableId: table.id },
  });

  res.json(reservation);
});


// Delete a single reservation
app.delete("/api/admin/reservations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.reservation.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: "Reservation not found" });
  }
});

// Delete all reservations matching the current filters (or everything if no filters)
app.delete("/api/admin/reservations", async (req, res) => {
  const { startDate, endDate, status } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.date = { gte: startDate };
  } else if (endDate) {
    where.date = { lte: endDate };
  }
  if (status) where.status = status;

  const result = await prisma.reservation.deleteMany({ where });
  res.json({ success: true, count: result.count });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});