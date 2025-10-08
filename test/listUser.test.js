const request = require("supertest");
const express = require("express");

jest.mock("../src/database/database", () => {
  let nextId = 1;
  const users = [];
  return {
    DB: {
      addUser: jest.fn(async ({ name, email, password, roles }) => {
        const user = { id: nextId++, name, email, roles };
        users.push({ ...user, password });
        return user;
      }),
      loginUser: jest.fn(async () => true),
      isLoggedIn: jest.fn(async () => true),
      getUser: jest.fn(async (email, password) =>
        users.find((u) => u.email === email && u.password === password)
      ),
      updateUser: jest.fn(async (id, name, email) => ({
        id,
        name,
        email,
        roles: [{ role: "diner" }],
      })),
      getUsers: jest.fn(async () => []),
      deleteUser: jest.fn(async (id) => {
        const index = users.findIndex((u) => u.id === id);
        if (index !== -1) users.splice(index, 1);
        return true;
      }),
    },
    Role: { Diner: "diner", Admin: "Admin" },
  };
});

const userRouter = require("../src/routes/userRouter");
const { authRouter, setAuthUser } = require("../src/routes/authRouter");
const jwt = require("jsonwebtoken");
const config = require("../src/config.js");

const app = express();
app.use(express.json());
// set auth user middleware so authRouter.authenticateToken works
app.use(setAuthUser);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);
});

test("list users", async () => {
  const userToken = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes.status).toBe(200);
});

test("delete user unauthorized", async () => {
  const res = await request(app).delete("/api/user/1");
  expect(res.status).toBe(401);
});

test("user can delete self", async () => {
  const token = await registerUser(request(app));
  const { id } = jwt.verify(token, config.jwtSecret);
  const res = await request(app)
    .delete(`/api/user/${id}`)
    .set("Authorization", "Bearer " + token);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: "user deleted" });
});

test("non-admin cannot delete others", async () => {
  const token1 = await registerUser(request(app));
  const token2 = await registerUser(request(app));
  const { id: id1 } = jwt.verify(token1, config.jwtSecret);
  // user 2 tries to delete user 1
  const res = await request(app)
    .delete(`/api/user/${id1}`)
    .set("Authorization", "Bearer " + token2);
  expect(res.status).toBe(403);
});

test("admin can delete others", async () => {
  // create a normal user to delete
  const token = await registerUser(request(app));
  const { id } = jwt.verify(token, config.jwtSecret);
  // create an admin token (DB.isLoggedIn mock returns true for any token)
  const adminToken = jwt.sign(
    {
      id: 999,
      name: "admin user",
      email: "admin@test.com",
      roles: [{ role: "Admin" }],
    },
    config.jwtSecret
  );
  const res = await request(app)
    .delete(`/api/user/${id}`)
    .set("Authorization", "Bearer " + adminToken);
  expect(res.status).toBe(200);
});

async function registerUser(service) {
  const testUser = {
    name: "pizza diner",
    email: `${randomName()}@test.com`,
    password: "a",
  };
  const registerRes = await service.post("/api/auth").send(testUser);
  // ensure password is available on returned user for other tests if needed
  if (registerRes.body && registerRes.body.user) {
    registerRes.body.user.password = testUser.password;
  }

  return registerRes.body.token;
}

// No registerAdmin via endpoint: we sign a token with Admin role directly

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
