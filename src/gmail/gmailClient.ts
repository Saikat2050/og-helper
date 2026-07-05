import {google} from "googleapis"
import {
	assertGmailConfigured,
	assertGmailOAuthConfigured,
	getGmailConfig
} from "./config"
import {GMAIL_SCOPES} from "./constants"

export function createGmailOAuthClient() {
	const config = getGmailConfig()

	return new google.auth.OAuth2(
		config.clientId,
		config.clientSecret,
		config.redirectUri
	)
}

export function getGmailAuthUrl(): string {
	assertGmailOAuthConfigured()

	const oauth2Client = createGmailOAuthClient()

	return oauth2Client.generateAuthUrl({
		access_type: "offline",
		prompt: "consent",
		scope: GMAIL_SCOPES
	})
}

export async function exchangeGmailAuthCode(code: string) {
	assertGmailOAuthConfigured()

	const oauth2Client = createGmailOAuthClient()
	const {tokens} = await oauth2Client.getToken(code)

	return {
		accessToken: tokens.access_token ?? null,
		refreshToken: tokens.refresh_token ?? null,
		expiryDate: tokens.expiry_date ?? null,
		scope: tokens.scope ?? null,
		tokenType: tokens.token_type ?? null
	}
}

export function getAuthenticatedGmailClient() {
	const config = assertGmailConfigured()
	const oauth2Client = createGmailOAuthClient()

	oauth2Client.setCredentials({
		refresh_token: config.refreshToken
	})

	return google.gmail({version: "v1", auth: oauth2Client})
}
