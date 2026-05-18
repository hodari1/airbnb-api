import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding...");

  // 1. Cleanup — delete in reverse order (children before parents)
  await prisma.booking.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned up existing data");

  // 2. Create users with upsert
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice Johnson",
      email: "alice@example.com",
      username: "alice_host",
      phone: "+250788000001",
      password: await bcrypt.hash("password123", 10),
      role: "HOST",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      name: "Bob Smith",
      email: "bob@example.com",
      username: "bob_host",
      phone: "+250788000002",
      password: await bcrypt.hash("password123", 10),
      role: "HOST",
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: {
      name: "Carol White",
      email: "carol@example.com",
      username: "carol_guest",
      phone: "+250788000003",
      password: await bcrypt.hash("password123", 10),
      role: "GUEST",
    },
  });

  const david = await prisma.user.upsert({
    where: { email: "david@example.com" },
    update: {},
    create: {
      name: "David Brown",
      email: "david@example.com",
      username: "david_guest",
      phone: "+250788000004",
      password: await bcrypt.hash("password123", 10),
      role: "GUEST",
    },
  });

  const eve = await prisma.user.upsert({
    where: { email: "eve@example.com" },
    update: {},
    create: {
      name: "Eve Davis",
      email: "eve@example.com",
      username: "eve_guest",
      phone: "+250788000005",
      password: await bcrypt.hash("password123", 10),
      role: "GUEST",
    },
  });

  console.log("👥 Users created");

  // 3. Create listings individually so we get their ids back
  const apartment = await prisma.listing.create({
    data: {
      title: "Cozy Studio in Kigali",
      description: "A modern studio apartment in the heart of Kigali city center.",
      location: "Kigali, Rwanda",
      pricePerNight: 45,
      guests: 2,
      type: "APARTMENT",
      amenities: ["WiFi", "Air Conditioning", "Kitchen"],
      hostId: alice.id,
    },
  });

  const house = await prisma.listing.create({
    data: {
      title: "Family House in Musanze",
      description: "A spacious family house near Volcanoes National Park.",
      location: "Musanze, Rwanda",
      pricePerNight: 80,
      guests: 6,
      type: "HOUSE",
      amenities: ["WiFi", "Parking", "Kitchen", "Garden"],
      hostId: alice.id,
    },
  });

  const villa = await prisma.listing.create({
    data: {
      title: "Lakeside Villa in Rubavu",
      description: "A beautiful villa with a stunning view of Lake Kivu.",
      location: "Rubavu, Rwanda",
      pricePerNight: 120,
      guests: 8,
      type: "VILLA",
      amenities: ["WiFi", "Pool", "Parking", "Garden", "Kitchen"],
      hostId: bob.id,
    },
  });

  const cabin = await prisma.listing.create({
    data: {
      title: "Mountain Cabin in Musanze",
      description: "A peaceful cabin near Volcanoes National Park.",
      location: "Musanze, Rwanda",
      pricePerNight: 75,
      guests: 4,
      type: "CABIN",
      amenities: ["Fireplace", "Parking", "Kitchen", "WiFi"],
      hostId: bob.id,
    },
  });

  console.log("🏠 Listings created");

  // 4. Create bookings with future dates
  await prisma.booking.create({
    data: {
      listingId: apartment.id,
      guestId: carol.id,
      checkIn: new Date("2026-07-01T10:00:00.000Z"),
      checkOut: new Date("2026-07-05T10:00:00.000Z"),
    },
  });

  await prisma.booking.create({
    data: {
      listingId: villa.id,
      guestId: david.id,
      checkIn: new Date("2026-08-10T10:00:00.000Z"),
      checkOut: new Date("2026-08-15T10:00:00.000Z"),
    },
  });

  await prisma.booking.create({
    data: {
      listingId: cabin.id,
      guestId: eve.id,
      checkIn: new Date("2026-09-01T10:00:00.000Z"),
      checkOut: new Date("2026-09-03T10:00:00.000Z"),
    },
  });

  console.log("📅 Bookings created");
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());