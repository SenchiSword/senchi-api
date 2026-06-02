const crypto = require('crypto');

const LICENSE_PROOF_ALGORITHM = 'ECDSA_P256_SHA256';
const LICENSE_PROOF_FIELDS = [
  'clientId',
  'status',
  'customerName',
  'customerEmail',
  'expiresAt',
  'machineId',
  'machineIds',
  'maxDevices',
  'lastSeenAt',
  'activatedAt',
  'appVersion',
  'issuedAt'
];

function normalizePem(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .trim();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function buildLicenseProofPayload(data) {
  return {
    clientId: String(data?.clientId || ''),
    status: String(data?.status || ''),
    customerName: String(data?.customerName || ''),
    customerEmail: String(data?.customerEmail || ''),
    expiresAt: data?.expiresAt || null,
    machineId: String(data?.machineId || ''),
    machineIds: normalizeArray(data?.machineIds),
    maxDevices: Number(data?.maxDevices || 0),
    lastSeenAt: data?.lastSeenAt || null,
    activatedAt: data?.activatedAt || null,
    appVersion: data?.appVersion || null,
    issuedAt: String(data?.issuedAt || '')
  };
}

function serializeLicenseProofPayload(data) {
  const payload = buildLicenseProofPayload(data);
  const ordered = {};
  for (const field of LICENSE_PROOF_FIELDS) {
    ordered[field] = payload[field];
  }
  return JSON.stringify(ordered);
}

function createLicenseProof(data, privateKeyPem, keyId = 'main') {
  const normalizedPrivateKey = normalizePem(privateKeyPem);
  if (!normalizedPrivateKey) {
    throw new Error('LICENSE_SIGNING_PRIVATE_KEY_PEM is not configured');
  }

  const issuedAt = new Date().toISOString();
  const payload = serializeLicenseProofPayload({
    ...data,
    issuedAt
  });

  const signature = crypto.sign('sha256', Buffer.from(payload, 'utf8'), {
    key: normalizedPrivateKey,
    dsaEncoding: 'ieee-p1363'
  });

  return {
    algorithm: LICENSE_PROOF_ALGORITHM,
    keyId,
    issuedAt,
    signature: signature.toString('base64')
  };
}

module.exports = {
  createLicenseProof,
  LICENSE_PROOF_ALGORITHM,
  serializeLicenseProofPayload
};
