import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  updateCurrentAccount,
} from "./authStorage.mjs";

function createStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

test("register stores an account and auto-selects it even when phone is blank", () => {
  const storage = createStorage();

  const result = registerAccount(storage, {
    email: "user@example.com",
    name: "Test User",
    password: "secret123",
    phone: "",
  });

  assert.equal(result.ok, true);
  assert.equal(result.account.phone, "");
  assert.deepEqual(getCurrentAccount(storage), {
    email: "user@example.com",
    name: "Test User",
    password: "secret123",
    phone: "",
  });
});

test("register rejects duplicate emails", () => {
  const storage = createStorage();

  registerAccount(storage, {
    email: "user@example.com",
    name: "Test User",
    password: "secret123",
    phone: "",
  });

  const duplicate = registerAccount(storage, {
    email: "USER@example.com",
    name: "Another User",
    password: "other-pass",
    phone: "09012345678",
  });

  assert.deepEqual(duplicate, {
    message: "このメールアドレスは既に登録されています。",
    ok: false,
  });
});

test("login succeeds only when email and password match a stored account", () => {
  const storage = createStorage();

  registerAccount(storage, {
    email: "user@example.com",
    name: "Test User",
    password: "secret123",
    phone: "",
  });
  logoutAccount(storage);

  const failed = loginAccount(storage, {
    email: "user@example.com",
    password: "wrong-password",
  });

  assert.deepEqual(failed, {
    message: "メールアドレスまたはパスワードが違います。",
    ok: false,
  });
  assert.equal(getCurrentAccount(storage), null);

  const success = loginAccount(storage, {
    email: "user@example.com",
    password: "secret123",
  });

  assert.equal(success.ok, true);
  assert.equal(getCurrentAccount(storage)?.email, "user@example.com");
});

test("updating the current account persists profile edits", () => {
  const storage = createStorage();

  registerAccount(storage, {
    email: "user@example.com",
    name: "Test User",
    password: "secret123",
    phone: "",
  });

  const result = updateCurrentAccount(storage, {
    name: "Updated User",
    phone: "09012345678",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(getCurrentAccount(storage), {
    email: "user@example.com",
    name: "Updated User",
    password: "secret123",
    phone: "09012345678",
  });
});
