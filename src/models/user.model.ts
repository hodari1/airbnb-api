export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: "host" | "guest";
  avatar?: string;
  bio?: string;
}

export const users: User[] = [
  {
    id: 1,
    name: "Hodari Jean",
    email: "hodari@email.com",
    username: "hodari1",
    phone: "+250788000001",
    role: "host",
    avatar: "https://i.pravatar.cc/150?img=1",
    bio: "Love hosting travelers in Rwanda",
  },
  {
    id: 2,
    name: "Alice Uwase",
    email: "alice@email.com",
    username: "alice_uw",
    phone: "+250788000002",
    role: "guest",
    avatar: "https://i.pravatar.cc/150?img=2",
    bio: "Explorer and food lover",
  },
  {
    id: 3,
    name: "Eric Mugisha",
    email: "eric@email.com",
    username: "eric_m",
    phone: "+250788000003",
    role: "host",
    bio: "Superhost with 5 properties in Kigali",
  },
];