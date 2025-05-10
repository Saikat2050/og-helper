import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"


class Validator {
	public async validateToken(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			let token: string = req.headers.authorization as string
			if (!token) {
				return next({
					statusCode: 401,
					code: `invalid_token`,
					message: "Missing authorization header"
				})
			}

			// @ts-ignore
			token = token.split("Bearer").pop().trim()

			const decoded = await jwt.verify(
				token,
				process.env.JWT_SECRET_KEY as string
			)
			if (!decoded) {
				throw new Error("Invalid token.")
			}
			const privateKey =
				typeof decoded === "string"
					? JSON.parse(decoded)?.privateKey ?? null
					: decoded?.privateKey ?? null
			if (!privateKey || privateKey.trim() !== process.env.PRIVATE_KEY) {
				throw new Error("Invalid token.")
			}

			next()
		} catch (err: any) {
			return next({
				statusCode: 401,
				code: `invalid_token`,
				message: err.message
			})
		}
	}
}

export default new Validator()
