const accountsStorageKey = "movieAccounts";
const currentUserStorageKey = "movieCurrentUserEmail";

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function readAccounts(storage) {
  const raw = storage.getItem(accountsStorageKey);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(storage, accounts) {
  storage.setItem(accountsStorageKey, JSON.stringify(accounts));
}

function findAccountIndex(accounts, email) {
  const normalizedEmail = normalizeEmail(email);
  return accounts.findIndex((account) => normalizeEmail(account.email) === normalizedEmail);
}

function buildStoredAccount(input, existingAccount = {}) {
  return {
    ...existingAccount,
    email: normalizeEmail(input.email ?? existingAccount.email),
    name: normalizeText(input.name ?? existingAccount.name),
    password: String(input.password ?? existingAccount.password ?? ""),
    phone: normalizeText(input.phone ?? existingAccount.phone),
    ...(input.nickname !== undefined || existingAccount.nickname !== undefined
      ? { nickname: normalizeText(input.nickname ?? existingAccount.nickname) }
      : {}),
  };
}

export function getCurrentAccount(storage) {
  const currentUserEmail = storage.getItem(currentUserStorageKey);

  if (!currentUserEmail) {
    return null;
  }

  const accounts = readAccounts(storage);
  return accounts.find(
    (account) => normalizeEmail(account.email) === normalizeEmail(currentUserEmail),
  ) ?? null;
}

export function registerAccount(storage, input) {
  const email = normalizeEmail(input.email);
  const name = normalizeText(input.name);
  const password = String(input.password ?? "");

  if (!name || !email || !password) {
    return {
      ok: false,
      message: "名前、メールアドレス、パスワードは必須です。",
    };
  }

  const accounts = readAccounts(storage);

  if (findAccountIndex(accounts, email) !== -1) {
    return {
      ok: false,
      message: "このメールアドレスは既に登録されています。",
    };
  }

  const account = buildStoredAccount(input);
  accounts.push(account);
  writeAccounts(storage, accounts);
  storage.setItem(currentUserStorageKey, account.email);

  return {
    ok: true,
    account,
  };
}

export function loginAccount(storage, input) {
  const email = normalizeEmail(input.email);
  const password = String(input.password ?? "");
  const accounts = readAccounts(storage);
  const account = accounts.find(
    (storedAccount) =>
      normalizeEmail(storedAccount.email) === email && storedAccount.password === password,
  );

  if (!account) {
    return {
      ok: false,
      message: "メールアドレスまたはパスワードが違います。",
    };
  }

  storage.setItem(currentUserStorageKey, account.email);

  return {
    ok: true,
    account,
  };
}

export function logoutAccount(storage) {
  storage.removeItem(currentUserStorageKey);
}

export function updateCurrentAccount(storage, updates) {
  const currentAccount = getCurrentAccount(storage);

  if (!currentAccount) {
    return {
      ok: false,
      message: "ログイン中のアカウントがありません。",
    };
  }

  const nextEmail = normalizeEmail(updates.email ?? currentAccount.email);
  const nextName = normalizeText(updates.name ?? currentAccount.name);

  if (!nextName || !nextEmail) {
    return {
      ok: false,
      message: "名前とメールアドレスは必須です。",
    };
  }

  const accounts = readAccounts(storage);
  const currentIndex = findAccountIndex(accounts, currentAccount.email);
  const duplicateIndex = findAccountIndex(accounts, nextEmail);

  if (duplicateIndex !== -1 && duplicateIndex !== currentIndex) {
    return {
      ok: false,
      message: "このメールアドレスは既に登録されています。",
    };
  }

  const account = buildStoredAccount(
    {
      ...updates,
      email: nextEmail,
      name: nextName,
    },
    currentAccount,
  );

  accounts[currentIndex] = account;
  writeAccounts(storage, accounts);
  storage.setItem(currentUserStorageKey, account.email);

  return {
    ok: true,
    account,
  };
}
