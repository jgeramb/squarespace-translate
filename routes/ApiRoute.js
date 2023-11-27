class ApiRoute {
  #method;
  #path;

  constructor(method, path) {
    this.#method = method;
    this.#path = path;
  }

  getMethod() {
    return this.#method;
  }

  getPath() {
    return this.#path;
  }

  async handleRequest(request) {
    throw new Error("Method 'handleRequest' is not implemented!");
  }
}

module.exports = ApiRoute;
