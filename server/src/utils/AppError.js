// An error with an HTTP status code, e.g. new AppError("Cart is empty", 400)
export default class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}