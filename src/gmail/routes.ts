import {NextFunction, Request, Response, Router} from "express"
import {exchangeGmailAuthCode, getGmailAuthUrl} from "./gmailClient"
import {
	deleteGmailMessage,
	getGmailMessage,
	listGmailLabels,
	listGmailMessages,
	markGmailMessageAsRead,
	markGmailMessageAsUnread
} from "./gmailService"

const router = Router()

function handleGmailError(error: unknown, next: NextFunction) {
	if (
		typeof error === "object" &&
		error !== null &&
		"statusCode" in error &&
		"message" in error
	) {
		return next(error)
	}

	const gmailError = error as {
		code?: number
		message?: string
		response?: {data?: {error?: {message?: string}}}
	}

	if (gmailError.code === 404) {
		return next({
			statusCode: 404,
			code: "gmail_message_not_found",
			message: "Gmail message not found"
		})
	}

	return next({
		statusCode: gmailError.code === 401 ? 401 : 422,
		code: "gmail_api_error",
		message:
			gmailError.response?.data?.error?.message ??
			gmailError.message ??
			"Gmail API request failed"
	})
}

router.get("/auth/url", (req, res, next) => {
	try {
		return res.json({
			authUrl: getGmailAuthUrl()
		})
	} catch (error) {
		return handleGmailError(error, next)
	}
})

export async function gmailOAuthCallback(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const code = (req.query.code as string | undefined)?.trim()

		if (!code) {
			return next({
				statusCode: 422,
				code: "validation_error",
				message: "Missing OAuth code"
			})
		}

		const tokens = await exchangeGmailAuthCode(code)

		return res.json({
			message:
				"Gmail connected. Save GMAIL_REFRESH_TOKEN in .env and restart the server.",
			...tokens
		})
	} catch (error) {
		return handleGmailError(error, next)
	}
}

router.get("/labels", async (req, res, next) => {
	try {
		const labels = await listGmailLabels()
		return res.json({labels})
	} catch (error) {
		return handleGmailError(error, next)
	}
})

router.get("/messages", async (req, res, next) => {
	try {
		const result = await listGmailMessages({
			label: req.query.label as string | undefined,
			pageToken: req.query.pageToken as string | undefined,
			maxResults: req.query.maxResults
				? Number(req.query.maxResults)
				: undefined
		})

		return res.json(result)
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.startsWith("Unsupported mailbox")
		) {
			return next({
				statusCode: 422,
				code: "validation_error",
				message: error.message
			})
		}

		return handleGmailError(error, next)
	}
})

router.get("/messages/:messageId", async (req, res, next) => {
	try {
		const message = await getGmailMessage(req.params.messageId)
		return res.json({message})
	} catch (error) {
		return handleGmailError(error, next)
	}
})

router.patch("/messages/:messageId/read", async (req, res, next) => {
	try {
		const result = await markGmailMessageAsRead(req.params.messageId)
		return res.json({
			message: "Email marked as read",
			...result
		})
	} catch (error) {
		return handleGmailError(error, next)
	}
})

router.patch("/messages/:messageId/unread", async (req, res, next) => {
	try {
		const result = await markGmailMessageAsUnread(req.params.messageId)
		return res.json({
			message: "Email marked as unread",
			...result
		})
	} catch (error) {
		return handleGmailError(error, next)
	}
})

router.delete("/messages/:messageId", async (req, res, next) => {
	try {
		const permanent =
			String(req.query.permanent ?? "false").toLowerCase() === "true"
		const result = await deleteGmailMessage(req.params.messageId, permanent)

		return res.json({
			message: permanent
				? "Email permanently deleted"
				: "Email moved to trash",
			...result
		})
	} catch (error) {
		return handleGmailError(error, next)
	}
})

export default router
