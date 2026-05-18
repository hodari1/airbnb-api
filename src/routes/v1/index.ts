import { Router } from "express";
import authRouter from "./auth.routes";
import usersRouter from "./users.routes";
import listingsRouter from "./listings.routes";
import bookingsRouter from "./bookings.routes";
import reviewsRouter from "./reviews.routes";
import profileRouter from "./profile.routes";
import avatarRouter from "./avatar.routes";
import photosRouter from "./photos.routes";
import statsRouter from "./stats.routes";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/listings", listingsRouter);
v1Router.use("/bookings", bookingsRouter);
v1Router.use("/listings/:id/reviews", reviewsRouter);
v1Router.use("/reviews", reviewsRouter);
v1Router.use("/users/:id/profile", profileRouter);
v1Router.use("/users/:id/avatar", avatarRouter);
v1Router.use("/listings/:id/photos", photosRouter);
v1Router.use("/", statsRouter);

export default v1Router;