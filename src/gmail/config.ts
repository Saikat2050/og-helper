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

export function assertGmailConfigured(): GmailConfig {
	const config = getGmailConfig()

	if (
		!config.clientId ||
		!config.clientSecret ||
		!config.redirectUri ||
		!config.refreshToken
	) {
		throw {
			statusCode: 503,
			code: "gmail_not_configured",
			message:
				"Gmail API is not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, and GMAIL_REFRESH_TOKEN to .env."
		}
	}

	return config
}
