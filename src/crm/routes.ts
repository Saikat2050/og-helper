import {NextFunction, Request, Response, Router} from "express"
import {loginCrmUser} from "./authService"
import {sendCrmEmail} from "./emailService"

const router = Router()

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

		return res.json({
			message: "Login successful",
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
