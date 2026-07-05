export type GmailConfig = {
	clientId: string
	clientSecret: string
	redirectUri: string
	refreshToken: string
	userEmail: string
}

export function getGmailConfig(): GmailConfig {
	return {
		clientId: process.env.GMAIL_CLIENT_ID ?? "",
		clientSecret: process.env.GMAIL_CLIENT_SECRET ?? "",
		redirectUri: process.env.GMAIL_REDIRECT_URI ?? "",
		refreshToken: process.env.GMAIL_REFRESH_TOKEN ?? "",
		userEmail: process.env.GMAIL_USER_EMAIL ?? ""
	}
}

export function assertGmailOAuthConfigured(): GmailConfig {
	const config = getGmailConfig()

	if (!config.clientId || !config.clientSecret || !config.redirectUri) {
		throw {
			statusCode: 503,
			code: "gmail_not_configured",
			message:
				"Gmail OAuth is not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI to .env."
		}
	}

	return config
}

export function assertGmailConfigured(): GmailConfig {
	const config = assertGmailOAuthConfigured()

	if (!config.refreshToken) {
		throw {
			statusCode: 503,
			code: "gmail_not_configured",
			message:
				"Gmail refresh token is missing. Complete the OAuth flow via GET /v1/gmail/auth/url and save GMAIL_REFRESH_TOKEN in .env."
		}
	}

	return config
}
