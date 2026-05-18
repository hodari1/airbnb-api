export interface Listing {
  id: number;
  title: string;
  description: string;
  location: string;
  pricePerNight: number; // ✅ changed from string
  guests: number;
  type: "apartment" | "house" | "villa" | "cabin";
  amenities: string[];
  rating?: number;
  host: string;
}

export const listings: Listing[] = [
  {
    id: 1,
    title: "Cozy Studio in Kigali",
    description: "A modern studio apartment in the heart of Kigali city center.",
    location: "Kigali, Rwanda",
    pricePerNight: 45,
    guests: 2,
    type: "apartment",
    amenities: ["WiFi", "Air Conditioning", "Kitchen"],
    rating: 4.5,
    host: "Hodari Jean",
  },
  {
    id: 2,
    title: "Lakeside Villa in Rubavu",
    description: "A beautiful villa with a stunning view of Lake Kivu.",
    location: "Rubavu, Rwanda",
    pricePerNight: 120,
    guests: 6,
    type: "villa",
    amenities: ["WiFi", "Pool", "Parking", "Garden"],
    rating: 4.8,
    host: "Eric Mugisha",
  },
  {
    id: 3,
    title: "Mountain Cabin in Musanze",
    description: "A peaceful cabin near Volcanoes National Park.",
    location: "Musanze, Rwanda",
    pricePerNight: 75,
    guests: 4,
    type: "cabin",
    amenities: ["Fireplace", "Parking", "Kitchen", "WiFi"],
    rating: 4.7,
    host: "Hodari Jean",
  },
];