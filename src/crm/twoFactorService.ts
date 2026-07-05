import jwt from "jsonwebtoken"
import QRCode from "qrcode"
import speakeasy from "speakeasy"
import {
	disableTwoFactor,
	enableTwoFactorSecret,
	getEnabledTwoFactorSecret,
	getPendingTwoFactorSecret,
	getTwoFactorStatus,
	isTwoFactorEnabled,
	savePendingTwoFactorSecret
} from "./twoFactorStore"

const TWO_FACTOR_APP_NAME = "Tech Square Nest CRM"
const TWO_FACTOR_TOKEN_EXPIRY = "5m"

function normalizeOtp(token: string | number): string {
	return String(token ?? "")
		.trim()
		.replace(/\s/g, "")
}

export function verifyTotpToken(
	secret: string,
	token: string | number
): boolean {
	return speakeasy.totp.verify({
		secret,
		encoding: "base32",
		token: normalizeOtp(token),
		window: 1
	})
}

export async function getCrmTwoFactorStatus() {
	return getTwoFactorStatus()
}

export async function createTwoFactorSetup(email: string) {
	if (await isTwoFactorEnabled()) {
		throw {
			statusCode: 422,
			code: "two_factor_already_enabled",
			message: "Two-factor authentication is already enabled"
		}
	}

	const secret = speakeasy.generateSecret({
		name: `${TWO_FACTOR_APP_NAME} (${email})`,
		issuer: TWO_FACTOR_APP_NAME
	})

	const base32Secret = secret.base32

	if (!base32Secret || !secret.otpauth_url) {
		throw new Error("Failed to generate two-factor secret")
	}

	await savePendingTwoFactorSecret(base32Secret)

	const qrCode = await QRCode.toDataURL(secret.otpauth_url)

	return {
		qrCode,
		secret: base32Secret
	}
}

export async function confirmTwoFactorSetup(token: string | number) {
	if (await isTwoFactorEnabled()) {
		throw {
			statusCode: 422,
			code: "two_factor_already_enabled",
			message: "Two-factor authentication is already enabled"
		}
	}

	const pendingSecret = await getPendingTwoFactorSecret()

	if (!pendingSecret) {
		throw {
			statusCode: 422,
			code: "two_factor_setup_required",
			message: "Generate a 2FA setup QR code before verifying"
		}
	}

	if (!verifyTotpToken(pendingSecret, token)) {
		throw {
			statusCode: 401,
			code: "invalid_two_factor_token",
			message: "Invalid authenticator code"
		}
	}

	await enableTwoFactorSecret(pendingSecret)

	return {
		twoFactorEnabled: true
	}
}

export async function removeTwoFactor(token: string | number) {
	const enabledSecret = await getEnabledTwoFactorSecret()

	if (!enabledSecret) {
		throw {
			statusCode: 422,
			code: "two_factor_not_enabled",
			message: "Two-factor authentication is not enabled"
		}
	}

	if (!verifyTotpToken(enabledSecret, token)) {
		throw {
			statusCode: 401,
			code: "invalid_two_factor_token",
			message: "Invalid authenticator code"
		}
	}

	await disableTwoFactor()

	return {
		twoFactorEnabled: false
	}
}

export function createTwoFactorLoginToken(email: string): string {
	return jwt.sign(
		{
			type: "crm_2fa_pending",
			email
		},
		process.env.JWT_SECRET_KEY as string,
		{expiresIn: TWO_FACTOR_TOKEN_EXPIRY}
	)
}

export function verifyTwoFactorLoginToken(twoFactorToken: string): string {
	const decoded = jwt.verify(
		twoFactorToken,
		process.env.JWT_SECRET_KEY as string
	)

	const payload = typeof decoded === "string" ? JSON.parse(decoded) : decoded

	if (payload?.type !== "crm_2fa_pending" || !payload?.email) {
		throw {
			statusCode: 401,
			code: "invalid_two_factor_session",
			message: "Invalid or expired two-factor login session"
		}
	}

	return String(payload.email)
}

export async function verifyLoginTwoFactor(
	twoFactorToken: string,
	token: string | number
) {
	const email = verifyTwoFactorLoginToken(twoFactorToken)
	const enabledSecret = await getEnabledTwoFactorSecret()

	if (!enabledSecret) {
		throw {
			statusCode: 422,
			code: "two_factor_not_enabled",
			message: "Two-factor authentication is not enabled"
		}
	}

	if (!verifyTotpToken(enabledSecret, token)) {
		throw {
			statusCode: 401,
			code: "invalid_two_factor_token",
			message: "Invalid authenticator code"
		}
	}

	return {email}
}

export {isTwoFactorEnabled}
