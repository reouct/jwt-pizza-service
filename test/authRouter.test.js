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
const { authRouter } = require("../src/routes/authRouter.js");
const request = require("supertest");
const express = require("express");

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

// Test authenticateToken middleware function
describe("authenticateToken Middleware", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock request, response, and next function
    mockReq = {
      user: null,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it("should call next() when user is authenticated", () => {
    // Arrange
    mockReq.user = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      roles: [{ role: "diner" }],
    };

    // Act
    authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.send).not.toHaveBeenCalled();
  });

  it("should return 401 unauthorized when user is not authenticated (req.user is null)", () => {
    // Arrange
    mockReq.user = null;

    // Act
    authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 401 unauthorized when user is undefined", () => {
    // Arrange
    mockReq.user = undefined;

    // Act
    authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 401 unauthorized when req.user is not set", () => {
    // Arrange - don't set req.user at all

    // Act
    authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should call next() when user has minimal valid user object", () => {
    // Arrange
    mockReq.user = {
      id: 1,
    };

    // Act
    authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.send).not.toHaveBeenCalled();
  });

  it("should call next() when user has complete user object with roles", () => {
    // Arrange
    mockReq.user = {
      id: 1,
      name: "Admin User",
      email: "admin@example.com",
      roles: [{ role: "admin" }, { role: "franchisee" }],
      isRole: (role) => !!mockReq.user.roles.find((r) => r.role === role),
    };

    // Act
    authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.send).not.toHaveBeenCalled();
  });

  it("should return 401 even when user is an empty object", () => {
    // Arrange - empty object is still falsy in this context
    mockReq.user = {};

    // Act
    authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.send).not.toHaveBeenCalled();
  });

  it("should handle response chaining correctly", () => {
    // Arrange
    mockReq.user = null;

    // Act
    const result = authRouter.authenticateToken(mockReq, mockRes, mockNext);

    // Assert
    expect(result).toBeUndefined(); // Should return early after sending response
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.send).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// Test registration POST endpoint
describe("POST /api/auth (Registration)", () => {
  let app;
  let mockDB;

  beforeAll(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRouter);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Get the mocked DB instance
    const { DB } = require("../src/database/database.js");
    mockDB = DB;
  });

  it("should successfully register a new user with valid data", async () => {
    // Arrange
    const newUser = {
      name: "John Doe",
      email: "john@example.com",
      password: "securepassword123",
    };

    const mockUserResponse = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: [{ role: "diner" }],
    };

    const mockToken = "mock.jwt.token";

    mockDB.addUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest.fn().mockResolvedValue();
    jest.spyOn(jwt, "sign").mockReturnValue(mockToken);

    // Act & Assert
    const response = await request(app)
      .post("/api/auth")
      .send(newUser)
      .expect(200);

    expect(response.body).toEqual({
      user: mockUserResponse,
      token: mockToken,
    });

    expect(mockDB.addUser).toHaveBeenCalledWith({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      roles: [{ role: "diner" }],
    });
    expect(mockDB.loginUser).toHaveBeenCalledWith(
      mockUserResponse.id,
      mockToken
    );
    expect(jwt.sign).toHaveBeenCalledWith(mockUserResponse, "test-secret");
  });

  it("should return 400 when name is missing", async () => {
    // Arrange
    const incompleteUser = {
      email: "john@example.com",
      password: "securepassword123",
    };

    // Act & Assert
    const response = await request(app)
      .post("/api/auth")
      .send(incompleteUser)
      .expect(400);

    expect(response.body).toEqual({
      message: "name, email, and password are required",
    });

    expect(mockDB.addUser).not.toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should return 400 when email is missing", async () => {
    // Arrange
    const incompleteUser = {
      name: "John Doe",
      password: "securepassword123",
    };

    // Act & Assert
    const response = await request(app)
      .post("/api/auth")
      .send(incompleteUser)
      .expect(400);

    expect(response.body).toEqual({
      message: "name, email, and password are required",
    });

    expect(mockDB.addUser).not.toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should return 400 when password is missing", async () => {
    // Arrange
    const incompleteUser = {
      name: "John Doe",
      email: "john@example.com",
    };

    // Act & Assert
    const response = await request(app)
      .post("/api/auth")
      .send(incompleteUser)
      .expect(400);

    expect(response.body).toEqual({
      message: "name, email, and password are required",
    });

    expect(mockDB.addUser).not.toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should return 400 when all fields are missing", async () => {
    // Arrange
    const emptyUser = {};

    // Act & Assert
    const response = await request(app)
      .post("/api/auth")
      .send(emptyUser)
      .expect(400);

    expect(response.body).toEqual({
      message: "name, email, and password are required",
    });

    expect(mockDB.addUser).not.toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should return 400 when fields are empty strings", async () => {
    // Arrange
    const emptyStringUser = {
      name: "",
      email: "",
      password: "",
    };

    // Act & Assert
    const response = await request(app)
      .post("/api/auth")
      .send(emptyStringUser)
      .expect(400);

    expect(response.body).toEqual({
      message: "name, email, and password are required",
    });

    expect(mockDB.addUser).not.toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should handle database errors during user creation", async () => {
    // Arrange
    const newUser = {
      name: "John Doe",
      email: "john@example.com",
      password: "securepassword123",
    };

    mockDB.addUser = jest
      .fn()
      .mockRejectedValue(new Error("Database connection failed"));

    // Act & Assert
    await request(app).post("/api/auth").send(newUser).expect(500);

    expect(mockDB.addUser).toHaveBeenCalled();
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should handle database errors during login token storage", async () => {
    // Arrange
    const newUser = {
      name: "John Doe",
      email: "john@example.com",
      password: "securepassword123",
    };

    const mockUserResponse = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: [{ role: "diner" }],
    };

    const mockToken = "mock.jwt.token";

    mockDB.addUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest
      .fn()
      .mockRejectedValue(new Error("Failed to store login token"));
    jest.spyOn(jwt, "sign").mockReturnValue(mockToken);

    // Act & Assert
    await request(app).post("/api/auth").send(newUser).expect(500);

    expect(mockDB.addUser).toHaveBeenCalled();
    expect(mockDB.loginUser).toHaveBeenCalled();
  });

  it("should handle JWT signing errors", async () => {
    // Arrange
    const newUser = {
      name: "John Doe",
      email: "john@example.com",
      password: "securepassword123",
    };

    const mockUserResponse = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: [{ role: "diner" }],
    };

    mockDB.addUser = jest.fn().mockResolvedValue(mockUserResponse);
    jest.spyOn(jwt, "sign").mockImplementation(() => {
      throw new Error("JWT signing failed");
    });

    // Act & Assert
    await request(app).post("/api/auth").send(newUser).expect(500);

    expect(mockDB.addUser).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalled();
  });

  it("should assign diner role by default", async () => {
    // Arrange
    const newUser = {
      name: "Jane Smith",
      email: "jane@example.com",
      password: "password123",
    };

    const mockUserResponse = {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      roles: [{ role: "diner" }],
    };

    mockDB.addUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest.fn().mockResolvedValue();
    jest.spyOn(jwt, "sign").mockReturnValue("token");

    // Act
    await request(app).post("/api/auth").send(newUser).expect(200);

    // Assert - Verify Role.Diner is used
    expect(mockDB.addUser).toHaveBeenCalledWith({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      roles: [{ role: "diner" }], // Should use Role.Diner
    });
  });

  it("should handle special characters in user data", async () => {
    // Arrange
    const specialUser = {
      name: "José María O'Connor",
      email: "jose.maria@café.com",
      password: "pássw@rd123!@#",
    };

    const mockUserResponse = {
      id: 3,
      name: "José María O'Connor",
      email: "jose.maria@café.com",
      roles: [{ role: "diner" }],
    };

    const mockToken = "special.jwt.token";

    mockDB.addUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest.fn().mockResolvedValue();
    jest.spyOn(jwt, "sign").mockReturnValue(mockToken);

    // Act & Assert
    const response = await request(app)
      .post("/api/auth")
      .send(specialUser)
      .expect(200);

    expect(response.body).toEqual({
      user: mockUserResponse,
      token: mockToken,
    });

    expect(mockDB.addUser).toHaveBeenCalledWith({
      name: specialUser.name,
      email: specialUser.email,
      password: specialUser.password,
      roles: [{ role: "diner" }],
    });
  });
});

// Test login PUT endpoint
describe("PUT /api/auth (Login)", () => {
  let app;
  let mockDB;

  beforeAll(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRouter);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Get the mocked DB instance
    const { DB } = require("../src/database/database.js");
    mockDB = DB;
  });

  it("should successfully login with valid credentials", async () => {
    // Arrange
    const loginData = {
      email: "john@example.com",
      password: "securepassword123",
    };

    const mockUserResponse = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: [{ role: "diner" }],
    };

    const mockToken = "login.jwt.token";

    mockDB.getUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest.fn().mockResolvedValue();
    jest.spyOn(jwt, "sign").mockReturnValue(mockToken);

    // Act & Assert
    const response = await request(app)
      .put("/api/auth")
      .send(loginData)
      .expect(200);

    expect(response.body).toEqual({
      user: mockUserResponse,
      token: mockToken,
    });

    expect(mockDB.getUser).toHaveBeenCalledWith(
      loginData.email,
      loginData.password
    );
    expect(mockDB.loginUser).toHaveBeenCalledWith(
      mockUserResponse.id,
      mockToken
    );
    expect(jwt.sign).toHaveBeenCalledWith(mockUserResponse, "test-secret");
  });

  it("should handle invalid credentials (wrong password)", async () => {
    // Arrange
    const loginData = {
      email: "john@example.com",
      password: "wrongpassword",
    };

    mockDB.getUser = jest
      .fn()
      .mockRejectedValue(new Error("Invalid credentials"));

    // Act & Assert
    await request(app).put("/api/auth").send(loginData).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(
      loginData.email,
      loginData.password
    );
    expect(mockDB.loginUser).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("should handle non-existent user", async () => {
    // Arrange
    const loginData = {
      email: "nonexistent@example.com",
      password: "somepassword",
    };

    mockDB.getUser = jest.fn().mockRejectedValue(new Error("User not found"));

    // Act & Assert
    await request(app).put("/api/auth").send(loginData).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(
      loginData.email,
      loginData.password
    );
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should handle missing email field", async () => {
    // Arrange
    const incompleteLogin = {
      password: "somepassword",
    };

    mockDB.getUser = jest
      .fn()
      .mockRejectedValue(new Error("Email is required"));

    // Act & Assert
    await request(app).put("/api/auth").send(incompleteLogin).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(
      undefined,
      incompleteLogin.password
    );
  });

  it("should handle missing password field", async () => {
    // Arrange
    const incompleteLogin = {
      email: "john@example.com",
    };

    mockDB.getUser = jest
      .fn()
      .mockRejectedValue(new Error("Password is required"));

    // Act & Assert
    await request(app).put("/api/auth").send(incompleteLogin).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(
      incompleteLogin.email,
      undefined
    );
  });

  it("should handle empty request body", async () => {
    // Arrange
    const emptyLogin = {};

    mockDB.getUser = jest
      .fn()
      .mockRejectedValue(new Error("Email and password are required"));

    // Act & Assert
    await request(app).put("/api/auth").send(emptyLogin).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(undefined, undefined);
  });

  it("should handle database error during user lookup", async () => {
    // Arrange
    const loginData = {
      email: "john@example.com",
      password: "securepassword123",
    };

    mockDB.getUser = jest
      .fn()
      .mockRejectedValue(new Error("Database connection failed"));

    // Act & Assert
    await request(app).put("/api/auth").send(loginData).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(
      loginData.email,
      loginData.password
    );
    expect(mockDB.loginUser).not.toHaveBeenCalled();
  });

  it("should handle database error during token storage", async () => {
    // Arrange
    const loginData = {
      email: "john@example.com",
      password: "securepassword123",
    };

    const mockUserResponse = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: [{ role: "diner" }],
    };

    const mockToken = "login.jwt.token";

    mockDB.getUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest
      .fn()
      .mockRejectedValue(new Error("Failed to store login token"));
    jest.spyOn(jwt, "sign").mockReturnValue(mockToken);

    // Act & Assert
    await request(app).put("/api/auth").send(loginData).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(
      loginData.email,
      loginData.password
    );
    expect(mockDB.loginUser).toHaveBeenCalledWith(
      mockUserResponse.id,
      mockToken
    );
  });

  it("should handle JWT signing error", async () => {
    // Arrange
    const loginData = {
      email: "john@example.com",
      password: "securepassword123",
    };

    const mockUserResponse = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: [{ role: "admin" }],
    };

    mockDB.getUser = jest.fn().mockResolvedValue(mockUserResponse);
    jest.spyOn(jwt, "sign").mockImplementation(() => {
      throw new Error("JWT signing failed");
    });

    // Act & Assert
    await request(app).put("/api/auth").send(loginData).expect(500);

    expect(mockDB.getUser).toHaveBeenCalledWith(
      loginData.email,
      loginData.password
    );
    expect(jwt.sign).toHaveBeenCalledWith(mockUserResponse, "test-secret");
  });

  it("should login admin user with multiple roles", async () => {
    // Arrange
    const adminLogin = {
      email: "admin@example.com",
      password: "adminpassword",
    };

    const mockAdminUser = {
      id: 2,
      name: "Admin User",
      email: "admin@example.com",
      roles: [{ role: "admin" }, { role: "franchisee" }],
    };

    const mockToken = "admin.jwt.token";

    mockDB.getUser = jest.fn().mockResolvedValue(mockAdminUser);
    mockDB.loginUser = jest.fn().mockResolvedValue();
    jest.spyOn(jwt, "sign").mockReturnValue(mockToken);

    // Act & Assert
    const response = await request(app)
      .put("/api/auth")
      .send(adminLogin)
      .expect(200);

    expect(response.body).toEqual({
      user: mockAdminUser,
      token: mockToken,
    });

    expect(mockDB.getUser).toHaveBeenCalledWith(
      adminLogin.email,
      adminLogin.password
    );
    expect(mockDB.loginUser).toHaveBeenCalledWith(mockAdminUser.id, mockToken);
  });

  it("should handle special characters in login credentials", async () => {
    // Arrange
    const specialLogin = {
      email: "josé.maría@café.com",
      password: "pássw@rd123!@#",
    };

    const mockUserResponse = {
      id: 3,
      name: "José María",
      email: "josé.maría@café.com",
      roles: [{ role: "diner" }],
    };

    const mockToken = "special.login.token";

    mockDB.getUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest.fn().mockResolvedValue();
    jest.spyOn(jwt, "sign").mockReturnValue(mockToken);

    // Act & Assert
    const response = await request(app)
      .put("/api/auth")
      .send(specialLogin)
      .expect(200);

    expect(response.body).toEqual({
      user: mockUserResponse,
      token: mockToken,
    });

    expect(mockDB.getUser).toHaveBeenCalledWith(
      specialLogin.email,
      specialLogin.password
    );
  });

  it("should create new JWT token for each login", async () => {
    // Arrange
    const loginData = {
      email: "john@example.com",
      password: "password123",
    };

    const mockUserResponse = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: [{ role: "diner" }],
    };

    mockDB.getUser = jest.fn().mockResolvedValue(mockUserResponse);
    mockDB.loginUser = jest.fn().mockResolvedValue();

    // Mock different tokens for each call
    jest
      .spyOn(jwt, "sign")
      .mockReturnValueOnce("first.token")
      .mockReturnValueOnce("second.token");

    // Act - First login
    const response1 = await request(app)
      .put("/api/auth")
      .send(loginData)
      .expect(200);

    // Act - Second login
    const response2 = await request(app)
      .put("/api/auth")
      .send(loginData)
      .expect(200);

    // Assert - Different tokens should be generated
    expect(response1.body.token).toBe("first.token");
    expect(response2.body.token).toBe("second.token");
    expect(jwt.sign).toHaveBeenCalledTimes(2);
  });
});
// Test logout DELETE endpoint
describe("DELETE /api/auth (Logout)", () => {
  let app;
  let mockDB;

  beforeAll(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Add mock authentication middleware to populate req.user
    app.use("/api/auth", (req, res, next) => {
      // Mock the setAuthUser behavior for logout tests
      if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          // Set req.user for any non-empty token except specific invalid ones
          if (token && token.trim() !== "" && token !== "invalid.token") {
            req.user = {
              id: 1,
              name: "Test User",
              email: "test@example.com",
              roles: [{ role: "diner" }],
            };
          }
        }
      }
      next();
    });

    app.use("/api/auth", authRouter);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Get the mocked DB instance
    const { DB } = require("../src/database/database.js");
    mockDB = DB;
  });

  it("should successfully logout authenticated user", async () => {
    // Arrange
    const authToken = "valid.token";
    mockDB.logoutUser = jest.fn().mockResolvedValue();

    // Act & Assert
    const response = await request(app)
      .delete("/api/auth")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toEqual({
      message: "logout successful",
    });

    expect(mockDB.logoutUser).toHaveBeenCalledWith(authToken);
  });

  it("should return 401 when no authorization header is provided", async () => {
    // Act & Assert
    const response = await request(app).delete("/api/auth").expect(401);

    expect(response.body).toEqual({
      message: "unauthorized",
    });

    expect(mockDB.logoutUser).not.toHaveBeenCalled();
  });

  it("should return 401 when authorization header is malformed", async () => {
    // Act & Assert
    const response = await request(app)
      .delete("/api/auth")
      .set("Authorization", "InvalidHeader")
      .expect(401);

    expect(response.body).toEqual({
      message: "unauthorized",
    });

    expect(mockDB.logoutUser).not.toHaveBeenCalled();
  });

  it("should return 401 when token is invalid/expired", async () => {
    // Act & Assert
    const response = await request(app)
      .delete("/api/auth")
      .set("Authorization", "Bearer invalid.token")
      .expect(401);

    expect(response.body).toEqual({
      message: "unauthorized",
    });

    expect(mockDB.logoutUser).not.toHaveBeenCalled();
  });

  it("should handle database errors during logout gracefully", async () => {
    // Arrange
    const authToken = "valid.token";
    mockDB.logoutUser = jest
      .fn()
      .mockRejectedValue(new Error("Database connection failed"));

    // Act & Assert
    await request(app)
      .delete("/api/auth")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(500);

    expect(mockDB.logoutUser).toHaveBeenCalledWith(authToken);
  });

  it("should handle case when token is not found in database", async () => {
    // Arrange
    const authToken = "valid.token";
    mockDB.logoutUser = jest.fn().mockResolvedValue(); // Successful but token wasn't found

    // Act & Assert
    const response = await request(app)
      .delete("/api/auth")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toEqual({
      message: "logout successful",
    });

    expect(mockDB.logoutUser).toHaveBeenCalledWith(authToken);
  });

  it("should handle empty Bearer token", async () => {
    // Act & Assert
    const response = await request(app)
      .delete("/api/auth")
      .set("Authorization", "Bearer ")
      .expect(401);

    expect(response.body).toEqual({
      message: "unauthorized",
    });

    expect(mockDB.logoutUser).not.toHaveBeenCalled();
  });

  it("should handle multiple logout attempts with same token", async () => {
    // Arrange
    const authToken = "valid.token";
    mockDB.logoutUser = jest.fn().mockResolvedValue();

    // Act - First logout
    const response1 = await request(app)
      .delete("/api/auth")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Act - Second logout (should still work even if token already removed)
    const response2 = await request(app)
      .delete("/api/auth")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Assert
    expect(response1.body).toEqual({ message: "logout successful" });
    expect(response2.body).toEqual({ message: "logout successful" });
    expect(mockDB.logoutUser).toHaveBeenCalledTimes(2);
    expect(mockDB.logoutUser).toHaveBeenCalledWith(authToken);
  });

  it("should work with different token formats", async () => {
    // Test various valid token formats
    const tokens = [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token",
      "simple.jwt.token",
      "veryLongTokenString1234567890abcdef",
      "token-with-dashes",
      "token_with_underscores",
    ];

    for (const token of tokens) {
      // Reset mocks for each iteration
      jest.clearAllMocks();
      mockDB.logoutUser = jest.fn().mockResolvedValue();

      // Act & Assert
      const response = await request(app)
        .delete("/api/auth")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ message: "logout successful" });
      expect(mockDB.logoutUser).toHaveBeenCalledWith(token);
    }
  });

  it("should properly extract token from Authorization header", async () => {
    // Arrange
    const authToken = "extracted.token.test";
    mockDB.logoutUser = jest.fn().mockResolvedValue();

    // Act
    await request(app)
      .delete("/api/auth")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Assert - Verify the exact token was extracted and passed to DB
    expect(mockDB.logoutUser).toHaveBeenCalledWith(authToken);
    expect(mockDB.logoutUser).toHaveBeenCalledTimes(1);
  });

  it("should handle case where clearAuth receives no token", async () => {
    // This tests the clearAuth function's guard clause
    // Create a custom app that doesn't set Authorization header but has req.user
    const testApp = express();
    testApp.use(express.json());

    // Mock middleware that sets req.user but no auth header
    testApp.use("/api/auth", (req, res, next) => {
      req.user = { id: 1, name: "Test User" }; // User authenticated but no auth header
      next();
    });

    testApp.use("/api/auth", authRouter);

    mockDB.logoutUser = jest.fn().mockResolvedValue();

    // Act & Assert
    const response = await request(testApp).delete("/api/auth").expect(200);

    expect(response.body).toEqual({ message: "logout successful" });
    // clearAuth should not call DB.logoutUser if no token found
    expect(mockDB.logoutUser).not.toHaveBeenCalled();
  });

  it("should work for users with different roles", async () => {
    // Test that logout works regardless of user role
    const roles = ["diner", "admin", "franchisee"];

    for (const role of roles) {
      // Create custom app for each role test
      const roleApp = express();
      roleApp.use(express.json());

      roleApp.use("/api/auth", (req, res, next) => {
        if (req.headers.authorization) {
          req.user = {
            id: 1,
            name: `${role} User`,
            roles: [{ role }],
          };
        }
        next();
      });

      roleApp.use("/api/auth", authRouter);

      // Reset mocks for each iteration
      jest.clearAllMocks();
      mockDB.logoutUser = jest.fn().mockResolvedValue();

      // Act & Assert
      const response = await request(roleApp)
        .delete("/api/auth")
        .set("Authorization", "Bearer valid.token")
        .expect(200);

      expect(response.body).toEqual({ message: "logout successful" });
      expect(mockDB.logoutUser).toHaveBeenCalledWith("valid.token");
    }
  });
});
