import {NextFunction, Request, Response, Router} from "express"
import {loginCrmUser, verifyCrmTwoFactorLogin} from "./authService"
import {sendCrmEmail} from "./emailService"
import {
	confirmTwoFactorSetup,
	createTwoFactorSetup,
	getCrmTwoFactorStatus,
	removeTwoFactor
} from "./twoFactorService"

const router = Router()

function getCrmEmailFromEnv(): string {
	return (process.env.CRM_EMAIL ?? "").trim().toLowerCase()
}

export async function crmLogin(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const email = req.body.email ?? req.body.payload?.email
		const password = req.body.password ?? req.body.payload?.password

		if (!email || !password) {
			return next({
				statusCode: 422,
				code: "validation_error",
				message: "Email and password are required"
			})
		}

		const result = await loginCrmUser(email, password)

		if (result.requiresTwoFactor) {
			return res.json({
				message: "Two-factor authentication required",
				...result
			})
		}

		return res.json(result)
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"statusCode" in error
		) {
			return next(error)
		}

		if (error instanceof Error) {
			return next({
				statusCode: 503,
				code: "crm_auth_not_configured",
				message: error.message
			})
		}

		return next(error)
	}
}

export async function crmVerifyTwoFactorLogin(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const twoFactorToken =
			req.body.twoFactorToken ?? req.body.payload?.twoFactorToken
		const token = req.body.token ?? req.body.otp ?? req.body.payload?.token

		if (!twoFactorToken || token === undefined || token === null) {
			return next({
				statusCode: 422,
				code: "validation_error",
				message: "twoFactorToken and token are required"
			})
		}

		const result = await verifyCrmTwoFactorLogin(twoFactorToken, token)

		return res.json(result)
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"statusCode" in error
		) {
			return next(error)
		}

		return next(error)
	}
}

router.get("/2fa/status", async (req, res, next) => {
	try {
		const status = await getCrmTwoFactorStatus()
		return res.json(status)
	} catch (error) {
		return next(error)
	}
})

router.post("/2fa/setup", async (req, res, next) => {
	try {
		const email = getCrmEmailFromEnv()

		if (!email) {
			return next({
				statusCode: 503,
				code: "crm_auth_not_configured",
				message: "CRM_EMAIL is not configured in .env."
			})
		}

		const setup = await createTwoFactorSetup(email)

		return res.json({
			message: "Scan this QR code with your authenticator app",
			...setup
		})
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"statusCode" in error
		) {
			return next(error)
		}

		return next(error)
	}
})

router.post("/2fa/enable", async (req, res, next) => {
	try {
		const token = req.body.token ?? req.body.otp ?? req.body.payload?.token

		if (token === undefined || token === null) {
			return next({
				statusCode: 422,
				code: "validation_error",
				message: "Authenticator code (token) is required"
			})
		}

		const result = await confirmTwoFactorSetup(token)

		return res.json({
			message: "Two-factor authentication enabled",
			...result
		})
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"statusCode" in error
		) {
			return next(error)
		}

		return next(error)
	}
})

router.post("/2fa/disable", async (req, res, next) => {
	try {
		const token = req.body.token ?? req.body.otp ?? req.body.payload?.token

		if (token === undefined || token === null) {
			return next({
				statusCode: 422,
				code: "validation_error",
				message: "Authenticator code (token) is required"
			})
		}

		const result = await removeTwoFactor(token)

		return res.json({
			message: "Two-factor authentication disabled",
			...result
		})
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"statusCode" in error
		) {
			return next(error)
		}

		return next(error)
	}
})

router.post("/send-email", async (req, res, next) => {
	try {
		const payload = req.body.payload ?? req.body

		const info = (await sendCrmEmail(payload)) as {
			messageId?: string
			response?: string
		}

		return res.json({
			message: "Email sent successfully!",
			messageId: info?.messageId ?? null,
			response: info?.response ?? null
		})
	} catch (error) {
		if (error instanceof Error) {
			return next({
				statusCode: 422,
				code: "validation_error",
				message: error.message
			})
		}

		return next(error)
	}
})

export default router
