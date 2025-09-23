// Unit tests for JWT Pizza Service functions and modules
const jwt = require("jsonwebtoken");

// Mock config module
jest.mock("../src/config.js", () => ({
  jwtSecret: "test-secret",
  db: {
    connection: {
      host: "localhost",
      user: "test",
      password: "test",
      database: "test",
    },
  },
}));

// Import after mocking
const { setAuthUser } = require("../src/routes/authRouter.js");

// Test setAuthUser middleware function
describe("setAuthUser Middleware", () => {
  let mockReq, mockRes, mockNext;
  let mockDB;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Get the mocked DB instance
    const { DB } = require("../src/database/database.js");
    mockDB = DB;

    // Create mock request, response, and next function
    mockReq = {
      headers: {},
      user: null,
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it("should set req.user when valid token and user is logged in", async () => {
    // Arrange
    const testToken = "valid.jwt.token";
    const testUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      roles: [{ role: "diner" }, { role: "admin" }],
    };

    mockReq.headers.authorization = `Bearer ${testToken}`;
    mockDB.isLoggedIn = jest.fn().mockResolvedValue(true);
    jest.spyOn(jwt, "verify").mockReturnValue(testUser);

    // Act
    await setAuthUser(mockReq, mockRes, mockNext);

    // Assert
    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(testToken);
    expect(jwt.verify).toHaveBeenCalledWith(testToken, "test-secret");
    expect(mockReq.user).toEqual(expect.objectContaining(testUser));
    expect(typeof mockReq.user.isRole).toBe("function");
    expect(mockReq.user.isRole("admin")).toBe(true);
    expect(mockReq.user.isRole("diner")).toBe(true);
    expect(mockReq.user.isRole("franchisee")).toBe(false);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should set req.user to null when token exists but user is not logged in", async () => {
    // Arrange
    const testToken = "expired.jwt.token";
    mockReq.headers.authorization = `Bearer ${testToken}`;
    mockDB.isLoggedIn = jest.fn().mockResolvedValue(false);

    // Act
    await setAuthUser(mockReq, mockRes, mockNext);

    // Assert
    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(testToken);
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(mockReq.user).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle JWT verification errors gracefully", async () => {
    // Arrange
    const testToken = "invalid.jwt.token";
    mockReq.headers.authorization = `Bearer ${testToken}`;
    mockDB.isLoggedIn = jest.fn().mockResolvedValue(true);
    jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid token");
    });

    // Act
    await setAuthUser(mockReq, mockRes, mockNext);

    // Assert
    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(testToken);
    expect(jwt.verify).toHaveBeenCalledWith(testToken, "test-secret");
    expect(mockReq.user).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    const testToken = "valid.jwt.token";
    mockReq.headers.authorization = `Bearer ${testToken}`;
    mockDB.isLoggedIn = jest
      .fn()
      .mockRejectedValue(new Error("Database error"));

    // Act
    await setAuthUser(mockReq, mockRes, mockNext);

    // Assert
    expect(mockDB.isLoggedIn).toHaveBeenCalledWith(testToken);
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(mockReq.user).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should proceed without setting user when no authorization header is present", async () => {
    // Arrange - no authorization header

    // Act
    await setAuthUser(mockReq, mockRes, mockNext);

    // Assert
    expect(mockDB.isLoggedIn).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(mockReq.user).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle malformed authorization header", async () => {
    // Arrange
    mockReq.headers.authorization = "InvalidHeader";

    // Act
    await setAuthUser(mockReq, mockRes, mockNext);

    // Assert
    expect(mockDB.isLoggedIn).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(mockReq.user).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle empty Bearer token", async () => {
    // Arrange
    mockReq.headers.authorization = "Bearer ";

    // Act
    await setAuthUser(mockReq, mockRes, mockNext);

    // Assert
    expect(mockDB.isLoggedIn).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(mockReq.user).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  describe("isRole function", () => {
    it("should correctly identify user roles", async () => {
      // Arrange
      const testToken = "valid.jwt.token";
      const testUser = {
        id: 1,
        name: "Test User",
        roles: [{ role: "diner" }, { role: "franchisee" }],
      };

      mockReq.headers.authorization = `Bearer ${testToken}`;
      mockDB.isLoggedIn = jest.fn().mockResolvedValue(true);
      jest.spyOn(jwt, "verify").mockReturnValue(testUser);

      // Act
      await setAuthUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.user.isRole("diner")).toBe(true);
      expect(mockReq.user.isRole("franchisee")).toBe(true);
      expect(mockReq.user.isRole("admin")).toBe(false);
      expect(mockReq.user.isRole("nonexistent")).toBe(false);
    });

    it("should handle empty roles array", async () => {
      // Arrange
      const testToken = "valid.jwt.token";
      const testUser = {
        id: 1,
        name: "Test User",
        roles: [],
      };

      mockReq.headers.authorization = `Bearer ${testToken}`;
      mockDB.isLoggedIn = jest.fn().mockResolvedValue(true);
      jest.spyOn(jwt, "verify").mockReturnValue(testUser);

      // Act
      await setAuthUser(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.user.isRole("diner")).toBe(false);
      expect(mockReq.user.isRole("admin")).toBe(false);
    });
  });
});
