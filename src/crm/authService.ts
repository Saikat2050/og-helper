import Crypto from "crypto"
import jwt from "jsonwebtoken"

function safeCompare(value: string, expected: string): boolean {
	const valueBuffer = Buffer.from(value)
	const expectedBuffer = Buffer.from(expected)

	if (valueBuffer.length !== expectedBuffer.length) {
		return false
	}

	return Crypto.timingSafeEqual(valueBuffer, expectedBuffer)
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

export async function loginCrmUser(email: string, password: string) {
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

	const expiresIn = process.env.JWT_TOKEN_EXPIRATION ?? "24h"
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
