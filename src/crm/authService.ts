import Crypto from "crypto"
import jwt from "jsonwebtoken"
import {
	createTwoFactorLoginToken,
	isTwoFactorEnabled,
	verifyLoginTwoFactor
} from "./twoFactorService"

function safeCompare(value: string, expected: string): boolean {
	const valueBytes = new TextEncoder().encode(value)
	const expectedBytes = new TextEncoder().encode(expected)

	if (valueBytes.length !== expectedBytes.length) {
		return false
	}

	return Crypto.timingSafeEqual(valueBytes, expectedBytes)
}

function getCrmCredentials() {
	return {
		email: (process.env.CRM_EMAIL ?? "").trim().toLowerCase(),
		password: process.env.CRM_PASSWORD ?? ""
	}
}

export function assertCrmAuthConfigured() {
	const {email, password} = getCrmCredentials()

	if (!email || !password) {
		throw new Error(
			"CRM login is not configured. Add CRM_EMAIL and CRM_PASSWORD to .env."
		)
	}
}

export function issueCrmJwt() {
	const expiresIn = process.env.JWT_TOKEN_EXPIRATION ?? "24h"
	const configured = getCrmCredentials()

	const token = jwt.sign(
		{
			privateKey: process.env.PRIVATE_KEY
		},
		process.env.JWT_SECRET_KEY as string,
		{expiresIn}
	)

	return {
		token,
		expiresIn,
		user: {
			email: configured.email
		}
	}
}

async function validateCrmCredentials(email: string, password: string) {
	assertCrmAuthConfigured()

	const configured = getCrmCredentials()
	const normalizedEmail = (email ?? "").trim().toLowerCase()
	const normalizedPassword = password ?? ""

	if (
		!safeCompare(normalizedEmail, configured.email) ||
		!safeCompare(normalizedPassword, configured.password)
	) {
		throw {
			statusCode: 401,
			code: "invalid_credentials",
			message: "Invalid email or password"
		}
	}

	return configured.email
}

export async function loginCrmUser(email: string, password: string) {
	const configuredEmail = await validateCrmCredentials(email, password)

	if (await isTwoFactorEnabled()) {
		return {
			requiresTwoFactor: true,
			twoFactorToken: createTwoFactorLoginToken(configuredEmail),
			user: {
				email: configuredEmail
			}
		}
	}

	return {
		requiresTwoFactor: false,
		message: "Login successful",
		...issueCrmJwt()
	}
}

export async function verifyCrmTwoFactorLogin(
	twoFactorToken: string,
	token: string | number
) {
	await verifyLoginTwoFactor(twoFactorToken, token)

	return {
		message: "Login successful",
		requiresTwoFactor: false,
		...issueCrmJwt()
	}
}
