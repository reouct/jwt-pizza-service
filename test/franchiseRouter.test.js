describe("DELETE /:franchiseId/store/:storeId", () => {
  it("should delete a store if user is admin", async () => {
    const mockFranchise = { id: 1, admins: [{ id: 4 }], name: "pizzaPocket" };
    DB.getFranchise = jest.fn().mockResolvedValue(mockFranchise);
    DB.deleteStore = jest.fn().mockResolvedValue();

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 99, isRole: (role) => role === "Admin" };
      next();
    });
    app.use("/", franchiseRouter);

    const res = await request(app).delete("/1/store/2");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "store deleted" });
    expect(DB.getFranchise).toHaveBeenCalledWith({ id: 1 });
    expect(DB.deleteStore).toHaveBeenCalledWith(1, 2);
  });

  it("should delete a store if user is franchise admin", async () => {
    const mockFranchise = { id: 1, admins: [{ id: 5 }], name: "pizzaPocket" };
    DB.getFranchise = jest.fn().mockResolvedValue(mockFranchise);
    DB.deleteStore = jest.fn().mockResolvedValue();

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 5, isRole: () => false };
      next();
    });
    app.use("/", franchiseRouter);

    const res = await request(app).delete("/1/store/2");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "store deleted" });
    expect(DB.getFranchise).toHaveBeenCalledWith({ id: 1 });
    expect(DB.deleteStore).toHaveBeenCalledWith(1, 2);
  });

  it("should return 403 if user is not admin or franchise admin", async () => {
    const mockFranchise = { id: 1, admins: [{ id: 4 }], name: "pizzaPocket" };
    DB.getFranchise = jest.fn().mockResolvedValue(mockFranchise);
    DB.deleteStore = jest.fn();

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 6, isRole: () => false };
      next();
    });
    app.use("/", franchiseRouter);

    const res = await request(app).delete("/1/store/2");
    expect(res.statusCode).toBe(403);
    expect(DB.deleteStore).not.toHaveBeenCalled();
  });
});
describe("POST /:franchiseId/store", () => {
  it("should create a store if user is admin", async () => {
    const mockFranchise = { id: 1, admins: [{ id: 4 }], name: "pizzaPocket" };
    const mockStore = { id: 1, name: "SLC", totalRevenue: 0 };
    DB.getFranchise = jest.fn().mockResolvedValue(mockFranchise);
    DB.createStore = jest.fn().mockResolvedValue(mockStore);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 99, isRole: (role) => role === "Admin" };
      next();
    });
    app.use("/", franchiseRouter);

    const res = await request(app).post("/1/store").send({ name: "SLC" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockStore);
    expect(DB.getFranchise).toHaveBeenCalledWith({ id: 1 });
    expect(DB.createStore).toHaveBeenCalledWith(1, { name: "SLC" });
  });

  it("should create a store if user is franchise admin", async () => {
    const mockFranchise = { id: 1, admins: [{ id: 5 }], name: "pizzaPocket" };
    const mockStore = { id: 2, name: "NYC", totalRevenue: 0 };
    DB.getFranchise = jest.fn().mockResolvedValue(mockFranchise);
    DB.createStore = jest.fn().mockResolvedValue(mockStore);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 5, isRole: () => false };
      next();
    });
    app.use("/", franchiseRouter);

    const res = await request(app).post("/1/store").send({ name: "NYC" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockStore);
    expect(DB.getFranchise).toHaveBeenCalledWith({ id: 1 });
    expect(DB.createStore).toHaveBeenCalledWith(1, { name: "NYC" });
  });

  it("should return 403 if user is not admin or franchise admin", async () => {
    const mockFranchise = { id: 1, admins: [{ id: 4 }], name: "pizzaPocket" };
    DB.getFranchise = jest.fn().mockResolvedValue(mockFranchise);
    DB.createStore = jest.fn();

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 6, isRole: () => false };
      next();
    });
    app.use("/", franchiseRouter);

    const res = await request(app).post("/1/store").send({ name: "LA" });
    expect(res.statusCode).toBe(403);
    expect(DB.createStore).not.toHaveBeenCalled();
  });
});
describe("DELETE /:franchiseId", () => {
  it("should delete a franchise and return success message", async () => {
    DB.deleteFranchise = jest.fn().mockResolvedValue();

    const app = express();
    app.use(express.json());
    app.use("/", franchiseRouter);

    const res = await request(app).delete("/1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: "franchise deleted" });
    expect(DB.deleteFranchise).toHaveBeenCalledWith(1);
  });
});
const request = require("supertest");
const express = require("express");

jest.mock("../src/database/database", () => {
  return {
    DB: {
      getFranchises: jest.fn(),
      getUserFranchises: jest.fn(),
    },
    Role: {
      Admin: "Admin",
    },
  };
});

const { DB } = require("../src/database/database");
const franchiseRouter = require("../src/routes/franchiseRouter");

describe("franchiseRouter", () => {
  describe("GET /", () => {
    it("should return franchises and more flag", async () => {
      const mockFranchises = [{ id: 1, name: "pizzaPocket" }];
      const mockMore = true;
      DB.getFranchises.mockResolvedValue([mockFranchises, mockMore]);

      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      app.use("/", franchiseRouter);

      const res = await request(app)
        .get("/")
        .query({ page: 0, limit: 10, name: "pizzaPocket" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ franchises: mockFranchises, more: mockMore });
      expect(DB.getFranchises).toHaveBeenCalledWith(
        { id: 1 },
        "0",
        "10",
        "pizzaPocket"
      );
    });
  });

  describe("GET /:userId", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    describe("POST /", () => {
      it("should create a franchise if user is admin", async () => {
        const mockFranchise = {
          name: "pizzaPocket",
          admins: [{ email: "f@jwt.com" }],
          id: 1,
        };
        DB.createFranchise = jest.fn().mockResolvedValue(mockFranchise);

        const app = express();
        app.use(express.json());
        app.use((req, res, next) => {
          req.user = { isRole: (role) => role === "Admin" };
          next();
        });
        app.use("/", franchiseRouter);

        const res = await request(app)
          .post("/")
          .send({ name: "pizzaPocket", admins: [{ email: "f@jwt.com" }] });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(mockFranchise);
        expect(DB.createFranchise).toHaveBeenCalledWith({
          name: "pizzaPocket",
          admins: [{ email: "f@jwt.com" }],
        });
      });

      it("should return 403 if user is not admin", async () => {
        DB.createFranchise = jest.fn();

        const app = express();
        app.use(express.json());
        app.use((req, res, next) => {
          req.user = { isRole: () => false };
          next();
        });
        app.use("/", franchiseRouter);

        const res = await request(app)
          .post("/")
          .send({ name: "pizzaPocket", admins: [{ email: "f@jwt.com" }] });
        // Print actual error response for inspection
        expect(res.statusCode).toBe(403);
        expect(DB.createFranchise).not.toHaveBeenCalled();
      });
    });
    it("should return user's franchises if user is self", async () => {
      const mockFranchises = [{ id: 2, name: "pizzaPocket" }];
      DB.getUserFranchises.mockResolvedValue(mockFranchises);

      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { id: 4, isRole: (role) => role === "Admin" };
        next();
      });
      app.use("/", franchiseRouter);

      const res = await request(app)
        .get("/4")
        .set("Authorization", "Bearer tttttt");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockFranchises);
      expect(DB.getUserFranchises).toHaveBeenCalledWith(4);
    });

    it("should return user's franchises if user is admin", async () => {
      const mockFranchises = [{ id: 2, name: "pizzaPocket" }];
      DB.getUserFranchises.mockResolvedValue(mockFranchises);

      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { id: 99, isRole: (role) => role === "Admin" };
        next();
      });
      app.use("/", franchiseRouter);

      const res = await request(app)
        .get("/4")
        .set("Authorization", "Bearer tttttt");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockFranchises);
      expect(DB.getUserFranchises).toHaveBeenCalledWith(4);
    });

    it("should return empty array if user is not self or admin", async () => {
      // No need to mockResolvedValue, should not be called
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { id: 5, isRole: () => false };
        next();
      });
      app.use("/", franchiseRouter);

      const res = await request(app)
        .get("/4")
        .set("Authorization", "Bearer tttttt");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
      expect(DB.getUserFranchises).not.toHaveBeenCalled();
    });
  });
});
