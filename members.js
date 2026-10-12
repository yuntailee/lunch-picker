export const GROUPS = ["公司", "仁愛醫院"];

const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export function findMember(members, name) {
  const trimmed = (name ?? "").trim();
  return members.find((member) => sameName(member.name, trimmed)) ?? null;
}

export function addMember(members, name) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!NAME_PATTERN.test(trimmed)) throw new Error("請輸入英文姓名");
  if (findMember(members, trimmed)) throw new Error(`「${trimmed}」已經存在`);
  return [...members, { name: trimmed, group: GROUPS[0] }];
}

export function removeMember(members, name) {
  return members.filter((member) => member.name !== name);
}

export function setGroup(members, name, group) {
  return members.map((member) => (member.name === name ? { ...member, group } : member));
}

export function serializeMembers(members) {
  return `${JSON.stringify({ members }, null, 2)}\n`;
}

export function serializeDirectory(directory) {
  return `${JSON.stringify(directory, null, 2)}\n`;
}

const ROSTER_SALT = "food-tool-roster-v1";

function normalizeName(name) {
  return (name ?? "").trim().replace(/\s+/g, " ");
}

function displayName(name) {
  return normalizeName(name).replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export async function memberHash(name) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizeName(name).toLowerCase()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rosterKey(secret) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode(ROSTER_SALT), iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealRoster(members, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await rosterKey(secret),
      new TextEncoder().encode(JSON.stringify(members)),
    ),
  );
  return `${bytesToBase64(iv)}.${bytesToBase64(cipher)}`;
}

export async function openRoster(sealed, secret) {
  const [iv, cipher] = sealed.split(".");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await rosterKey(secret),
    base64ToBytes(cipher),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function toDirectory(members, secret) {
  return {
    members: await Promise.all(
      members.map(async (member) => {
        const row = { hash: await memberHash(member.name), group: member.group };
        if (member.admin) row.admin = true;
        return row;
      }),
    ),
    roster: await sealRoster(members, secret),
  };
}

export async function matchMember(members, name) {
  const trimmed = normalizeName(name);
  if (!trimmed) return null;
  const hash = await memberHash(trimmed);
  const found = members.find((member) => member.hash === hash);
  return found ? { ...found, name: displayName(trimmed) } : null;
}

export function locationsForGroup(configLocations, crawledLocations, group, categories = []) {
  return configLocations
    .filter((location) => location.group === group)
    .map((location) => {
      const crawled = crawledLocations.find((item) => item.name === location.name);
      return crawled ?? { ...location, tags: categories, restaurants: null };
    });
}
