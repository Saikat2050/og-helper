import Crypto from "crypto"
import fs from "fs"
import path from "path"
import {promisify} from "util"

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

export type TwoFactorRecord = {
	twoFactorEnabled: boolean
	twoFactorSecretEncrypted: string | null
	pendingSecretEncrypted: string | null
}

const defaultRecord: TwoFactorRecord = {
	twoFactorEnabled: false,
	twoFactorSecretEncrypted: null,
	pendingSecretEncrypted: null
}

const encryptCred = {
	secret_key: process.env.CRYPTO_SECRET_KEY as string,
	secret_iv: process.env.CRYPTO_SECRET_IV as string,
	encryption_method: process.env.CRYPTO_ENCRYPTION_METHOD as string
}

const key = Crypto.createHash("sha256")
	.update(encryptCred.secret_key)
	.digest("hex")
	.substring(0, 32)

const encryptionIV = Crypto.createHash("sha256")
	.update(encryptCred.secret_iv)
	.digest("hex")
	.substring(0, 16)

function getStorePath(): string {
	const configuredPath = process.env.CRM_2FA_STORE_PATH

	if (configuredPath) {
		return configuredPath
	}

	return path.join(__dirname, "../../data/crm/two-factor.json")
}

function assertCryptoConfigured() {
	if (
		!encryptCred.secret_key ||
		!encryptCred.secret_iv ||
		!encryptCred.encryption_method
	) {
		throw new Error(
			"CRYPTO_SECRET_KEY, CRYPTO_SECRET_IV, and CRYPTO_ENCRYPTION_METHOD are required for 2FA storage."
		)
	}
}

function encryptValue(value: string): string {
	assertCryptoConfigured()

	const cipher = Crypto.createCipheriv(
		encryptCred.encryption_method,
		key,
		encryptionIV
	)

	return Buffer.from(
		cipher.update(value, "utf8", "hex") + cipher.final("hex")
	).toString("base64")
}

function decryptValue(encryptedValue: string): string {
	assertCryptoConfigured()

	const buff = Buffer.from(encryptedValue, "base64")
	const decipher = Crypto.createDecipheriv(
		encryptCred.encryption_method,
		key,
		encryptionIV
	)

	return (
		decipher.update(buff.toString("utf8"), "hex", "utf8") +
		decipher.final("utf8")
	)
}

async function ensureStoreDirectory() {
	const storePath = getStorePath()
	const directory = path.dirname(storePath)

	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, {recursive: true})
	}
}

export async function readTwoFactorRecord(): Promise<TwoFactorRecord> {
	await ensureStoreDirectory()

	const storePath = getStorePath()

	if (!fs.existsSync(storePath)) {
		return {...defaultRecord}
	}

	const raw = await readFile(storePath, "utf8")
	return {...defaultRecord, ...JSON.parse(raw)}
}

async function writeTwoFactorRecord(record: TwoFactorRecord) {
	await ensureStoreDirectory()
	await writeFile(getStorePath(), JSON.stringify(record, null, 2), "utf8")
}

export async function getTwoFactorStatus() {
	const record = await readTwoFactorRecord()

	return {
		twoFactorEnabled: record.twoFactorEnabled
	}
}

export async function savePendingTwoFactorSecret(secret: string) {
	const record = await readTwoFactorRecord()

	record.pendingSecretEncrypted = encryptValue(secret)
	await writeTwoFactorRecord(record)
}

export async function getPendingTwoFactorSecret(): Promise<string | null> {
	const record = await readTwoFactorRecord()

	if (!record.pendingSecretEncrypted) {
		return null
	}

	return decryptValue(record.pendingSecretEncrypted)
}

export async function enableTwoFactorSecret(secret: string) {
	const record = await readTwoFactorRecord()

	record.twoFactorEnabled = true
	record.twoFactorSecretEncrypted = encryptValue(secret)
	record.pendingSecretEncrypted = null
	await writeTwoFactorRecord(record)
}

export async function getEnabledTwoFactorSecret(): Promise<string | null> {
	const record = await readTwoFactorRecord()

	if (!record.twoFactorEnabled || !record.twoFactorSecretEncrypted) {
		return null
	}

	return decryptValue(record.twoFactorSecretEncrypted)
}

export async function disableTwoFactor() {
	await writeTwoFactorRecord({...defaultRecord})
}

export async function isTwoFactorEnabled(): Promise<boolean> {
	const record = await readTwoFactorRecord()
	return record.twoFactorEnabled
}
