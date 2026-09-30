import { notifyMenuChanged } from "../services/menuEvents.js";

// Put this on any route that changes the menu. When the request finishes
// successfully (status below 400), every kiosk is told to reload the menu.
export const announceMenuChange = (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode < 400) notifyMenuChanged();
  });
  next();
};