class HttpError extends Error {
  /**
   *
   * @param {number} errorCode 'HTTP Status code'
   * @param {String} message 'Helper Message'
   * @param {String} publicMessage 'Message to be sent to the frontend'
   */
  constructor(
    errorCode,
    message = "Unknown error",
    publicMessage = "An error occurred."
  ) {
    super(message); // Add a "message" property
    this.code = +errorCode || 500; // Adds a "code" property
    this.publicMessage =
      publicMessage === HttpError.SAME ? message : publicMessage;
  }
  toString() {
    return `Status code: ${this.code}, Message: ${this.message}`;
  }
  static SAME = "SAME";
}

module.exports = HttpError;
